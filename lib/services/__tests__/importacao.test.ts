import { prisma } from "../../db";
import {
  importarUsuarios,
  importarCursos,
  importarVinculosDocente,
  importarVinculosCoordenador,
} from "../importacao";
import { MODELOS_IMPORTACAO, decodificarPlanilha, gerarModeloCsv, lerPlanilha } from "../../importacao";
import { Perfil } from "../../../generated/prisma/client";

async function limpar() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "VinculoCoordenadorCurso", "VinculoDocenteCurso", "PeriodoLetivo", "Curso", "UsuarioPerfil", "Usuario" RESTART IDENTITY CASCADE`,
  );
}

// Como o Excel em português salva: ";" e CRLF.
function planilha(...linhas: string[]): Uint8Array {
  return new TextEncoder().encode(linhas.join("\r\n"));
}

async function perfisDe(email: string) {
  const registros = await prisma.usuarioPerfil.findMany({ where: { usuario: { email } } });
  return registros.map((registro) => registro.perfil).sort();
}

async function obterAmbiente() {
  const [ana, bruno, inativo] = await Promise.all([
    prisma.usuario.create({ data: { nome: "Ana Gonçalves", email: "ana@srha.dev" } }),
    prisma.usuario.create({ data: { nome: "Bruno Lima", email: "bruno@srha.dev" } }),
    prisma.usuario.create({ data: { nome: "Inês Inativa", email: "ines@srha.dev", ativo: false } }),
  ]);
  const [computacao, software, extinto] = await Promise.all([
    prisma.curso.create({ data: { nome: "Ciência da Computação" } }),
    prisma.curso.create({ data: { nome: "Engenharia de Software" } }),
    prisma.curso.create({ data: { nome: "Curso Extinto", ativo: false } }),
  ]);
  const periodo = await prisma.periodoLetivo.create({
    data: {
      ano: 2026,
      semestre: 2,
      aberturaSubmissao: new Date("2026-08-01T00:00:00Z"),
      encerramentoSubmissao: new Date("2026-12-15T23:59:59Z"),
    },
  });
  return { ana, bruno, inativo, computacao, software, extinto, periodo };
}

beforeEach(async () => {
  await limpar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("leitura da planilha", () => {
  test("o modelo gerado é lido de volta, com BOM e linhas em branco do Excel no meio", () => {
    const modelo = MODELOS_IMPORTACAO.vinculosDocente;
    const texto = `${gerarModeloCsv(modelo)}ana@srha.dev;Ciência da Computação;2026;2\r\n;;;\r\nbruno@srha.dev;Engenharia de Software;2026;2\r\n`;

    const { linhas, erros } = lerPlanilha(texto, modelo);

    expect(erros).toEqual([]);
    expect(linhas).toEqual([
      { linha: 2, valores: { email: "ana@srha.dev", curso: "Ciência da Computação", ano: "2026", semestre: "2" } },
      { linha: 4, valores: { email: "bruno@srha.dev", curso: "Engenharia de Software", ano: "2026", semestre: "2" } },
    ]);
  });

  test("aceita vírgula como separador e cabeçalho sem acento, hífen ou caixa igual", () => {
    const { linhas } = lerPlanilha("NOME,email\nAna,ana@srha.dev", MODELOS_IMPORTACAO.usuarios);
    expect(linhas[0].valores).toEqual({ nome: "Ana", email: "ana@srha.dev", secretaria: "" });

    const comAcento = { nomeArquivo: "modelo.csv", colunas: [{ chave: "descricao", rotulo: "Descrição", obrigatoria: true, exemplo: "" }] };
    const { linhas: semAcento } = lerPlanilha("Descricao\nOrientação", comAcento);
    expect(semAcento[0].valores).toEqual({ descricao: "Orientação" });
  });

  test("planilha de uma coluna não parte o nome na vírgula", () => {
    const { linhas } = lerPlanilha("Nome\r\nAdministração, Gestão e Negócios", MODELOS_IMPORTACAO.cursos);
    expect(linhas[0].valores.nome).toBe("Administração, Gestão e Negócios");
  });

  test("coluna obrigatória ausente no cabeçalho recusa a planilha inteira", () => {
    expect(() => lerPlanilha("Nome\nAna", MODELOS_IMPORTACAO.usuarios)).toThrow(/Coluna ausente.*E-mail/);
  });

  test("planilha só com cabeçalho é recusada", () => {
    expect(() => lerPlanilha("Nome;E-mail\r\n;\r\n", MODELOS_IMPORTACAO.usuarios)).toThrow(/nenhuma linha/);
  });

  test("CSV salvo pelo Excel em Windows-1252 mantém os acentos", () => {
    // "Conceição" em Windows-1252: ç = 0xE7, ã = 0xE3.
    const bytes = new Uint8Array([0x43, 0x6f, 0x6e, 0x63, 0x65, 0x69, 0xe7, 0xe3, 0x6f]);
    expect(decodificarPlanilha(bytes)).toBe("Conceição");
  });
});

describe("importarUsuarios", () => {
  test("cria os usuários com e-mail em minúsculas e perfil de secretaria quando marcado", async () => {
    const resultado = await importarUsuarios(
      planilha("Nome;E-mail;Secretaria", "Ana Gonçalves;Ana@SRHA.dev;", "Sílvia Secretaria;silvia@srha.dev;Sim"),
    );

    expect(resultado).toEqual({ gravado: true, importados: 2, jaExistiam: 0 });
    expect(await perfisDe("ana@srha.dev")).toEqual([]);
    expect(await perfisDe("silvia@srha.dev")).toEqual([Perfil.SECRETARIA]);
  });

  test("e-mail já cadastrado é pulado sem alterar o cadastro existente", async () => {
    await prisma.usuario.create({ data: { nome: "Ana Original", email: "ana@srha.dev", ativo: false } });

    const resultado = await importarUsuarios(
      planilha("Nome;E-mail;Secretaria", "Ana Nova;ana@srha.dev;Sim", "Bruno Lima;bruno@srha.dev;Não"),
    );

    expect(resultado).toEqual({ gravado: true, importados: 1, jaExistiam: 1 });
    const ana = await prisma.usuario.findUniqueOrThrow({ where: { email: "ana@srha.dev" } });
    expect(ana).toMatchObject({ nome: "Ana Original", ativo: false });
    expect(await perfisDe("ana@srha.dev")).toEqual([]);
  });

  test("linha repetida que também tem outro erro mostra os dois de uma vez", async () => {
    const resultado = await importarUsuarios(
      planilha("Nome;E-mail;Secretaria", "Ana;ana@srha.dev;", "Outra Ana;ana@srha.dev;talvez"),
    );

    expect(resultado).toEqual({
      gravado: false,
      erros: [
        { linha: 3, erro: "E-mail repetido na planilha (já está na linha 2)." },
        { linha: 3, erro: "Secretaria: use Sim ou Não." },
      ],
    });
  });

  test("reimportar a mesma planilha não muda nada nem dá erro", async () => {
    const arquivo = planilha("Nome;E-mail", "Ana;ana@srha.dev", "Bruno;bruno@srha.dev");
    await importarUsuarios(arquivo);

    expect(await importarUsuarios(arquivo)).toEqual({ gravado: true, importados: 0, jaExistiam: 2 });
    expect(await prisma.usuario.count()).toBe(2);
  });

  test("qualquer linha com erro: nada é gravado e cada erro aponta a linha do arquivo", async () => {
    const resultado = await importarUsuarios(
      planilha(
        "Nome;E-mail;Secretaria",
        "Ana;ana@srha.dev;",
        "Bruno;não-é-email;",
        "Carla;carla@srha.dev;talvez",
        ";dani@srha.dev;",
        "Ana de Novo;ANA@srha.dev;",
      ),
    );

    expect(resultado).toEqual({
      gravado: false,
      erros: [
        { linha: 3, erro: "E-mail inválido." },
        { linha: 4, erro: "Secretaria: use Sim ou Não." },
        { linha: 5, erro: "Não preenchido: Nome." },
        { linha: 6, erro: "E-mail repetido na planilha (já está na linha 2)." },
      ],
    });
    expect(await prisma.usuario.count()).toBe(0);
  });
});

describe("importarCursos", () => {
  test("curso com o mesmo nome em outra caixa ou com espaço a mais conta como já existente", async () => {
    await prisma.curso.create({ data: { nome: "Engenharia Civil" } });

    const resultado = await importarCursos(planilha("Nome", "engenharia  civil", "Direito"));

    expect(resultado).toEqual({ gravado: true, importados: 1, jaExistiam: 1 });
    const cursos = await prisma.curso.findMany({ orderBy: { nome: "asc" } });
    expect(cursos.map((curso) => curso.nome)).toEqual(["Direito", "Engenharia Civil"]);
  });
});

describe("importarVinculosDocente", () => {
  test("cria os vínculos e dá o perfil de docente", async () => {
    const { ana, computacao, software, periodo } = await obterAmbiente();

    const resultado = await importarVinculosDocente(
      planilha(
        "E-mail do docente;Curso;Ano;Semestre",
        "ana@srha.dev;Ciência da Computação;2026;2",
        "ANA@srha.dev;engenharia de software;2026;2",
      ),
    );

    expect(resultado).toEqual({ gravado: true, importados: 2, jaExistiam: 0 });
    const vinculos = await prisma.vinculoDocenteCurso.findMany({ orderBy: { id: "asc" } });
    expect(vinculos).toMatchObject([
      { docenteId: ana.id, cursoId: computacao.id, periodoLetivoId: periodo.id },
      { docenteId: ana.id, cursoId: software.id, periodoLetivoId: periodo.id },
    ]);
    expect(await perfisDe("ana@srha.dev")).toEqual([Perfil.DOCENTE]);
  });

  test("referência inexistente ou inativa: nada é gravado, nem as linhas boas", async () => {
    await obterAmbiente();

    const resultado = await importarVinculosDocente(
      planilha(
        "E-mail do docente;Curso;Ano;Semestre",
        "ana@srha.dev;Ciência da Computação;2026;2",
        "ninguem@srha.dev;Ciência da Computação;2026;2",
        "ines@srha.dev;Ciência da Computação;2026;2",
        "bruno@srha.dev;Curso Extinto;2026;2",
        "bruno@srha.dev;Medicina;2026;2",
        "bruno@srha.dev;Ciência da Computação;2027;1",
        "bruno@srha.dev;Ciência da Computação;2026;3",
      ),
    );

    expect(resultado).toEqual({
      gravado: false,
      erros: [
        { linha: 3, erro: "Nenhum usuário cadastrado com o e-mail ninguem@srha.dev." },
        { linha: 4, erro: "O usuário ines@srha.dev está inativo." },
        { linha: 5, erro: 'Curso "Curso Extinto" está inativo.' },
        { linha: 6, erro: 'Curso "Medicina" não cadastrado.' },
        { linha: 7, erro: "Período 2027/1 não cadastrado." },
        { linha: 8, erro: "Semestre deve ser 1 ou 2." },
      ],
    });
    expect(await prisma.vinculoDocenteCurso.count()).toBe(0);
    expect(await perfisDe("ana@srha.dev")).toEqual([]);
  });

  test("vínculo que já existe é pulado e contado", async () => {
    const { ana, computacao, periodo } = await obterAmbiente();
    await prisma.vinculoDocenteCurso.create({
      data: { docenteId: ana.id, cursoId: computacao.id, periodoLetivoId: periodo.id },
    });

    const resultado = await importarVinculosDocente(
      planilha(
        "E-mail do docente;Curso;Ano;Semestre",
        "ana@srha.dev;Ciência da Computação;2026;2",
        "bruno@srha.dev;Ciência da Computação;2026;2",
      ),
    );

    expect(resultado).toEqual({ gravado: true, importados: 1, jaExistiam: 1 });
    expect(await prisma.vinculoDocenteCurso.count()).toBe(2);
  });
});

describe("importarVinculosCoordenador", () => {
  test("grava na ordem da planilha, que decide quem avalia primeiro, e dá o perfil de coordenador", async () => {
    const { ana, bruno, computacao } = await obterAmbiente();

    const resultado = await importarVinculosCoordenador(
      planilha(
        "E-mail do coordenador;Curso",
        "bruno@srha.dev;Ciência da Computação",
        "ana@srha.dev;Ciência da Computação",
      ),
    );

    expect(resultado).toEqual({ gravado: true, importados: 2, jaExistiam: 0 });
    const vinculos = await prisma.vinculoCoordenadorCurso.findMany({
      where: { cursoId: computacao.id },
      orderBy: { id: "asc" },
    });
    expect(vinculos.map((vinculo) => vinculo.coordenadorId)).toEqual([bruno.id, ana.id]);
    expect(await perfisDe("bruno@srha.dev")).toEqual([Perfil.COORDENADOR]);
  });

  test("perfil que o usuário já tinha não é duplicado", async () => {
    const { ana } = await obterAmbiente();
    await prisma.usuarioPerfil.create({ data: { usuarioId: ana.id, perfil: Perfil.COORDENADOR } });

    await importarVinculosCoordenador(planilha("E-mail do coordenador;Curso", "ana@srha.dev;Engenharia de Software"));

    expect(await perfisDe("ana@srha.dev")).toEqual([Perfil.COORDENADOR]);
  });
});
