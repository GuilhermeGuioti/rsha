import { z } from "zod";
import { prisma } from "../db";
import { Perfil } from "../../generated/prisma/client";
import {
  MODELOS_IMPORTACAO,
  decodificarPlanilha,
  lerPlanilha,
  type ErroLinha,
  type LinhaPlanilha,
  type ResultadoImportacao,
} from "../importacao";

// Regras da importação de cadastro por planilha, comuns a todos os cadastros:
// - tudo ou nada: qualquer linha com erro e nada é gravado;
// - o que já está cadastrado é pulado e contado, nunca alterado — reimportar
//   a mesma planilha não muda nada nem dá erro;
// - linha repetida dentro da própria planilha é erro, porque costuma ser
//   engano (o mesmo e-mail com dois nomes, por exemplo).

type LinhaValida<T> = { linha: number; dados: T };

function validarLinhas<S extends z.ZodType>(
  linhas: LinhaPlanilha[],
  schema: S,
  erros: ErroLinha[],
): LinhaValida<z.output<S>>[] {
  const validas: LinhaValida<z.output<S>>[] = [];
  for (const { linha, valores } of linhas) {
    const resultado = schema.safeParse(valores);
    if (resultado.success) {
      validas.push({ linha, dados: resultado.data });
    } else {
      erros.push({ linha, erro: resultado.error.issues.map((problema) => problema.message).join(" ") });
    }
  }
  return validas;
}

// Sobre os valores crus, antes do zod: linha repetida que também tem outro
// erro aparece com os dois de uma vez, sem obrigar a uma segunda rodada.
function apontarRepetidas(
  linhas: LinhaPlanilha[],
  chave: (valores: Record<string, string>) => string,
  oQue: string,
  erros: ErroLinha[],
): void {
  const primeiraLinha = new Map<string, number>();
  for (const { linha, valores } of linhas) {
    const anterior = primeiraLinha.get(chave(valores));
    if (anterior === undefined) {
      primeiraLinha.set(chave(valores), linha);
    } else {
      erros.push({ linha, erro: `${oQue} repetido na planilha (já está na linha ${anterior}).` });
    }
  }
}

function falhou(erros: ErroLinha[]): ResultadoImportacao {
  return { gravado: false, erros: [...erros].sort((a, b) => a.linha - b.linha) };
}

// O @unique do banco diferencia caixa e espaço: sem isto, "engenharia civil"
// viraria um segundo curso ao lado de "Engenharia Civil".
function chaveNome(nome: string): string {
  return nome.replace(/\s+/g, " ").toLowerCase();
}

type Cadastro = { id: number; ativo: boolean };

// Dois cadastros que só diferem na caixa (o banco permite) deixam o nome
// ambíguo — melhor recusar a linha do que vincular ao errado.
function indexarPorNome<T extends Cadastro>(registros: T[], nome: (registro: T) => string) {
  const indice = new Map<string, T | "ambiguo">();
  for (const registro of registros) {
    const chave = chaveNome(nome(registro));
    indice.set(chave, indice.has(chave) ? "ambiguo" : registro);
  }
  return indice;
}

function resolverCurso(
  indice: Map<string, Cadastro | "ambiguo">,
  nome: string,
  linha: number,
  erros: ErroLinha[],
): number | null {
  const curso = indice.get(chaveNome(nome));
  if (!curso) {
    erros.push({ linha, erro: `Curso "${nome}" não cadastrado.` });
  } else if (curso === "ambiguo") {
    erros.push({ linha, erro: `Há mais de um curso cadastrado com o nome "${nome}".` });
  } else if (!curso.ativo) {
    erros.push({ linha, erro: `Curso "${nome}" está inativo.` });
  } else {
    return curso.id;
  }
  return null;
}

function resolverUsuario(
  indice: Map<string, Cadastro>,
  email: string,
  linha: number,
  erros: ErroLinha[],
): number | null {
  const usuario = indice.get(email);
  if (!usuario) {
    erros.push({ linha, erro: `Nenhum usuário cadastrado com o e-mail ${email}.` });
  } else if (!usuario.ativo) {
    erros.push({ linha, erro: `O usuário ${email} está inativo.` });
  } else {
    return usuario.id;
  }
  return null;
}

// Gravado e comparado em minúsculas, como no cadastro manual e no login.
const Email = z.string().toLowerCase();

const SimNao = z.string().transform((valor, contexto) => {
  const normalizado = valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (normalizado === "" || normalizado === "nao") return false;
  if (normalizado === "sim") return true;
  contexto.addIssue({ code: "custom", message: "Secretaria: use Sim ou Não." });
  return z.NEVER;
});

const SchemaLinhaUsuario = z.object({
  nome: z.string(),
  email: Email.pipe(z.email("E-mail inválido.")),
  secretaria: SimNao,
});

export async function importarUsuarios(bytes: Uint8Array): Promise<ResultadoImportacao> {
  const { linhas, erros } = lerPlanilha(decodificarPlanilha(bytes), MODELOS_IMPORTACAO.usuarios);
  apontarRepetidas(linhas, (valores) => valores.email.toLowerCase(), "E-mail", erros);
  const validas = validarLinhas(linhas, SchemaLinhaUsuario, erros);
  if (erros.length > 0) return falhou(erros);

  return prisma.$transaction(async (tx): Promise<ResultadoImportacao> => {
    const existentes = await tx.usuario.findMany({
      where: { email: { in: validas.map(({ dados }) => dados.email) } },
      select: { email: true },
    });
    const jaCadastrados = new Set(existentes.map((usuario) => usuario.email));
    const novos = validas.filter(({ dados }) => !jaCadastrados.has(dados.email));

    // skipDuplicates: outra importação simultânea pode ter gravado o mesmo
    // e-mail entre a consulta acima e aqui — conta como "já existia".
    const criados = await tx.usuario.createManyAndReturn({
      data: novos.map(({ dados }) => ({ nome: dados.nome, email: dados.email })),
      select: { id: true, email: true },
      skipDuplicates: true,
    });
    const secretarias = new Set(novos.filter(({ dados }) => dados.secretaria).map(({ dados }) => dados.email));
    await tx.usuarioPerfil.createMany({
      data: criados
        .filter((usuario) => secretarias.has(usuario.email))
        .map((usuario) => ({ usuarioId: usuario.id, perfil: Perfil.SECRETARIA })),
    });
    return { gravado: true, importados: criados.length, jaExistiam: validas.length - criados.length };
  });
}

const SchemaLinhaCurso = z.object({ nome: z.string() });

export async function importarCursos(bytes: Uint8Array): Promise<ResultadoImportacao> {
  const { linhas, erros } = lerPlanilha(decodificarPlanilha(bytes), MODELOS_IMPORTACAO.cursos);
  apontarRepetidas(linhas, (valores) => chaveNome(valores.nome), "Curso", erros);
  const validas = validarLinhas(linhas, SchemaLinhaCurso, erros);
  if (erros.length > 0) return falhou(erros);

  const existentes = await prisma.curso.findMany({ select: { nome: true } });
  const jaCadastrados = new Set(existentes.map((curso) => chaveNome(curso.nome)));
  const { count } = await prisma.curso.createMany({
    data: validas.filter(({ dados }) => !jaCadastrados.has(chaveNome(dados.nome))).map(({ dados }) => dados),
    skipDuplicates: true,
  });
  return { gravado: true, importados: count, jaExistiam: validas.length - count };
}

const SchemaLinhaTipoAtividade = z.object({ descricao: z.string() });

export async function importarTiposAtividade(bytes: Uint8Array): Promise<ResultadoImportacao> {
  const { linhas, erros } = lerPlanilha(decodificarPlanilha(bytes), MODELOS_IMPORTACAO.tiposAtividade);
  apontarRepetidas(linhas, (valores) => chaveNome(valores.descricao), "Tipo de atividade", erros);
  const validas = validarLinhas(linhas, SchemaLinhaTipoAtividade, erros);
  if (erros.length > 0) return falhou(erros);

  const existentes = await prisma.tipoAtividade.findMany({ select: { descricao: true } });
  const jaCadastrados = new Set(existentes.map((tipo) => chaveNome(tipo.descricao)));
  const { count } = await prisma.tipoAtividade.createMany({
    data: validas.filter(({ dados }) => !jaCadastrados.has(chaveNome(dados.descricao))).map(({ dados }) => dados),
    skipDuplicates: true,
  });
  return { gravado: true, importados: count, jaExistiam: validas.length - count };
}

const SchemaLinhaVinculoDocente = z.object({
  email: Email,
  curso: z.string(),
  ano: z.string().regex(/^\d{4}$/, "Ano inválido — use quatro dígitos, como 2026.").transform(Number),
  semestre: z.enum(["1", "2"], "Semestre deve ser 1 ou 2.").transform(Number),
});

export async function importarVinculosDocente(bytes: Uint8Array): Promise<ResultadoImportacao> {
  const { linhas, erros } = lerPlanilha(decodificarPlanilha(bytes), MODELOS_IMPORTACAO.vinculosDocente);
  apontarRepetidas(
    linhas,
    (valores) => `${valores.email.toLowerCase()}|${chaveNome(valores.curso)}|${valores.ano}/${valores.semestre}`,
    "Vínculo",
    erros,
  );
  const validas = validarLinhas(linhas, SchemaLinhaVinculoDocente, erros);

  return prisma.$transaction(async (tx): Promise<ResultadoImportacao> => {
    const usuarios = await tx.usuario.findMany({
      where: { email: { in: validas.map(({ dados }) => dados.email) } },
      select: { id: true, email: true, ativo: true },
    });
    const cursos = await tx.curso.findMany({ select: { id: true, nome: true, ativo: true } });
    const periodos = await tx.periodoLetivo.findMany({ select: { id: true, ano: true, semestre: true } });
    const usuarioPorEmail = new Map(usuarios.map((usuario) => [usuario.email, usuario]));
    const cursoPorNome = indexarPorNome(cursos, (curso) => curso.nome);
    const periodoPorRotulo = new Map(periodos.map((periodo) => [`${periodo.ano}/${periodo.semestre}`, periodo.id]));

    const vinculos: { docenteId: number; cursoId: number; periodoLetivoId: number }[] = [];
    for (const { linha, dados } of validas) {
      const docenteId = resolverUsuario(usuarioPorEmail, dados.email, linha, erros);
      const cursoId = resolverCurso(cursoPorNome, dados.curso, linha, erros);
      const periodoLetivoId = periodoPorRotulo.get(`${dados.ano}/${dados.semestre}`);
      if (periodoLetivoId === undefined) {
        erros.push({ linha, erro: `Período ${dados.ano}/${dados.semestre} não cadastrado.` });
      }
      if (docenteId !== null && cursoId !== null && periodoLetivoId !== undefined) {
        vinculos.push({ docenteId, cursoId, periodoLetivoId });
      }
    }
    if (erros.length > 0) return falhou(erros);

    const existentes = await tx.vinculoDocenteCurso.findMany({
      where: { docenteId: { in: vinculos.map((vinculo) => vinculo.docenteId) } },
      select: { docenteId: true, cursoId: true, periodoLetivoId: true },
    });
    const chave = (vinculo: (typeof vinculos)[number]) =>
      `${vinculo.docenteId}|${vinculo.cursoId}|${vinculo.periodoLetivoId}`;
    const jaCadastrados = new Set(existentes.map(chave));
    const { count } = await tx.vinculoDocenteCurso.createMany({
      data: vinculos.filter((vinculo) => !jaCadastrados.has(chave(vinculo))),
      skipDuplicates: true,
    });
    // Mesma consequência do vínculo manual (sincronizarPerfil): quem tem
    // vínculo de docente tem o perfil de docente.
    await tx.usuarioPerfil.createMany({
      data: [...new Set(vinculos.map((vinculo) => vinculo.docenteId))].map((usuarioId) => ({
        usuarioId,
        perfil: Perfil.DOCENTE,
      })),
      skipDuplicates: true,
    });
    return { gravado: true, importados: count, jaExistiam: vinculos.length - count };
  });
}

const SchemaLinhaVinculoCoordenador = z.object({ email: Email, curso: z.string() });

export async function importarVinculosCoordenador(bytes: Uint8Array): Promise<ResultadoImportacao> {
  const { linhas, erros } = lerPlanilha(decodificarPlanilha(bytes), MODELOS_IMPORTACAO.vinculosCoordenador);
  apontarRepetidas(linhas, (valores) => `${valores.email.toLowerCase()}|${chaveNome(valores.curso)}`, "Vínculo", erros);
  const validas = validarLinhas(linhas, SchemaLinhaVinculoCoordenador, erros);

  return prisma.$transaction(async (tx): Promise<ResultadoImportacao> => {
    const usuarios = await tx.usuario.findMany({
      where: { email: { in: validas.map(({ dados }) => dados.email) } },
      select: { id: true, email: true, ativo: true },
    });
    const cursos = await tx.curso.findMany({ select: { id: true, nome: true, ativo: true } });
    const usuarioPorEmail = new Map(usuarios.map((usuario) => [usuario.email, usuario]));
    const cursoPorNome = indexarPorNome(cursos, (curso) => curso.nome);

    const vinculos: { coordenadorId: number; cursoId: number }[] = [];
    for (const { linha, dados } of validas) {
      const coordenadorId = resolverUsuario(usuarioPorEmail, dados.email, linha, erros);
      const cursoId = resolverCurso(cursoPorNome, dados.curso, linha, erros);
      if (coordenadorId !== null && cursoId !== null) {
        vinculos.push({ coordenadorId, cursoId });
      }
    }
    if (erros.length > 0) return falhou(erros);

    const existentes = await tx.vinculoCoordenadorCurso.findMany({
      where: { coordenadorId: { in: vinculos.map((vinculo) => vinculo.coordenadorId) } },
      select: { coordenadorId: true, cursoId: true },
    });
    const chave = (vinculo: (typeof vinculos)[number]) => `${vinculo.coordenadorId}|${vinculo.cursoId}`;
    const jaCadastrados = new Set(existentes.map(chave));
    // Na ordem da planilha: o avaliador é o primeiro coordenador ativo pela
    // ordem de cadastro do vínculo, e um INSERT só numera as linhas na ordem
    // em que vêm.
    const { count } = await tx.vinculoCoordenadorCurso.createMany({
      data: vinculos.filter((vinculo) => !jaCadastrados.has(chave(vinculo))),
      skipDuplicates: true,
    });
    await tx.usuarioPerfil.createMany({
      data: [...new Set(vinculos.map((vinculo) => vinculo.coordenadorId))].map((usuarioId) => ({
        usuarioId,
        perfil: Perfil.COORDENADOR,
      })),
      skipDuplicates: true,
    });
    return { gravado: true, importados: count, jaExistiam: vinculos.length - count };
  });
}
