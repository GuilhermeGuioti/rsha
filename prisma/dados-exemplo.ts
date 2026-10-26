import "dotenv/config";
import { DiaSemana, Perfil, SituacaoRelatorio, TipoEvento } from "../generated/prisma/enums";
import { prisma } from "../lib/db";
import { seed } from "./seed";

// Cenário de exemplo para desenvolvimento, em escala média: 10 cursos, ~45
// usuários, o período aberto e os três anteriores, ~150 relatórios em todas
// as situações. Roda sobre banco zerado:
//
//   npx prisma migrate reset --force && npm run db:exemplo
//
// Chama o seed antes (idempotente), então os usuários do login falso estão no
// meio dos dados. Sorteio com semente fixa: o banco sai igual toda vez.
//
// Grava direto pelo Prisma, não pelo workflow: o workflow carimba tudo com a
// hora atual e recusa envio fora do prazo, e a história aqui precisa de datas
// no passado. Por isso o script repete à mão as regras que o workflow
// garante — total igual à soma dos itens, avaliador = primeiro coordenador
// ativo do curso, eventos em ordem, envio dentro do prazo — e cria cada
// relatório como rascunho, só mudando a situação depois dos itens (o trigger
// recusa item em relatório já aprovado).

const DIA = 86_400_000;
const HORA = 3_600_000;

function criarSorteio(semente: number) {
  let estado = semente >>> 0;
  // mulberry32
  const numero = () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    numero,
    inteiro: (minimo: number, maximo: number) => minimo + Math.floor(numero() * (maximo - minimo + 1)),
    item: <T>(lista: readonly T[]): T => lista[Math.floor(numero() * lista.length)],
    chance: (probabilidade: number) => numero() < probabilidade,
  };
}

const sorteio = criarSorteio(20261026);

const CURSOS_NOVOS = [
  "Administração",
  "Direito",
  "Enfermagem",
  "Psicologia",
  "Engenharia Civil",
  "Arquitetura e Urbanismo",
  "Medicina Veterinária",
];

// Direito tem dois coordenadores: Rogério, inativado, vem primeiro na ordem de
// cadastro — testa que coordenador inativo sai da fila e o próximo assume.
const COORDENADORES_NOVOS: { nome: string; curso: string; ativo?: boolean }[] = [
  { nome: "Renata Albuquerque", curso: "Administração" },
  { nome: "Rogério Antunes", curso: "Direito", ativo: false },
  { nome: "Beatriz Lacerda", curso: "Direito" },
  { nome: "Sílvia Moreira", curso: "Enfermagem" },
  { nome: "Eduardo Prado", curso: "Psicologia" },
  { nome: "Fernando Queiroz", curso: "Engenharia Civil" },
  { nome: "Luísa Campos", curso: "Arquitetura e Urbanismo" },
  { nome: "Ricardo Fontana", curso: "Medicina Veterinária" },
];

const QUANTIDADE_DOCENTES_NOVOS = 34;

const PRENOMES = [
  "Ana", "Bruno", "Camila", "Daniel", "Elisa", "Fábio", "Gabriela", "Henrique", "Isabela", "João",
  "Juliana", "Leonardo", "Mariana", "Nelson", "Olívia", "Pedro", "Rafaela", "Sérgio", "Tatiana", "Vinícius",
  "Aline", "Caio", "Débora", "Gustavo", "Larissa", "Murilo", "Natália", "Otávio", "Priscila", "Thiago",
];
const SOBRENOMES = [
  "Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Figueiredo", "Gomes", "Hidalgo", "Ibrahim", "Junqueira",
  "Lima", "Machado", "Nogueira", "Oliveira", "Pacheco", "Ramos", "Siqueira", "Teixeira", "Vieira", "Zanetti",
  "Bastos", "Coelho", "Dias", "Ferraz", "Guimarães", "Leal", "Menezes", "Pires", "Rezende", "Sampaio",
];

const DESCRICOES: Record<string, string[]> = {
  "Estágio Supervisionado": [
    "Visita técnica de supervisão de estágio.",
    "Reunião com os supervisores de campo.",
    "Correção dos relatórios parciais de estágio.",
  ],
  "Núcleo Docente Estruturante": [
    "Reunião do NDE para revisão do projeto pedagógico do curso.",
    "Análise dos planos de ensino do semestre.",
  ],
  "Orientação de TCC": [
    "Orientação de dois trabalhos de conclusão de curso.",
    "Leitura e devolutiva das versões parciais dos TCCs.",
    "Participação em banca de qualificação.",
  ],
  "Orientação Didático-Pedagógica": [
    "Atendimento a alunos com dificuldade de aprendizagem.",
    "Plantão de dúvidas antes das avaliações.",
  ],
  "Prática Supervisionada": [
    "Acompanhamento dos atendimentos na clínica-escola.",
    "Supervisão de prática em laboratório.",
  ],
  "Projetos de Extensão": [
    "Ação de extensão na comunidade do entorno.",
    "Planejamento de oficina para escola pública.",
  ],
  "Projetos Especiais": [
    "Organização da semana acadêmica.",
    "Preparação de material para a avaliação do curso pelo MEC.",
  ],
};

const JUSTIFICATIVAS = [
  "Detalhar as atividades de orientação: quantos alunos e quais temas.",
  "A carga horária do projeto de extensão está acima do previsto no plano. Revisar.",
  "O horário informado conflita com a grade de aulas. Corrigir.",
  "Descrição genérica demais; especificar as entregas do período.",
  "Faltou declarar a participação no NDE registrada em ata.",
];

const DIAS: DiaSemana[] = [
  DiaSemana.SEGUNDA,
  DiaSemana.TERCA,
  DiaSemana.QUARTA,
  DiaSemana.QUINTA,
  DiaSemana.SEXTA,
  DiaSemana.SABADO,
];

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function formatarHorario(inicio: number, horas: number): string {
  const fim = inicio + horas;
  const hora = (valor: number) => `${Math.floor(valor)}h${valor % 1 ? "30" : ""}`;
  return `${hora(inicio)}-${hora(fim)}`;
}

// Prazos no fuso da instituição: abre à 0h e fecha às 23h59 de Brasília (UTC-3).
function prazosDoPeriodo(ano: number, semestre: number) {
  return semestre === 1
    ? {
        aberturaSubmissao: new Date(Date.UTC(ano, 1, 1, 3)),
        encerramentoSubmissao: new Date(Date.UTC(ano, 6, 11, 2, 59)),
      }
    : {
        aberturaSubmissao: new Date(Date.UTC(ano, 7, 1, 3)),
        encerramentoSubmissao: new Date(Date.UTC(ano, 11, 11, 2, 59)),
      };
}

function periodoAnterior(ano: number, semestre: number): { ano: number; semestre: number } {
  return semestre === 1 ? { ano: ano - 1, semestre: 2 } : { ano, semestre: 1 };
}

// `quantidade` instantes em ordem crescente dentro de [inicio, fim].
function instantesEntre(inicio: Date, fim: Date, quantidade: number): Date[] {
  const intervalo = fim.getTime() - inicio.getTime();
  return Array.from({ length: quantidade }, () => inicio.getTime() + sorteio.numero() * intervalo)
    .sort((a, b) => a - b)
    .map((valor) => new Date(Math.round(valor / 60_000) * 60_000));
}

type Periodo = { id: number; ano: number; semestre: number; abertura: Date; encerramento: Date; aberto: boolean };

type Roteiro =
  | { situacao: "RASCUNHO" }
  | { situacao: "AGUARDANDO_AVALIACAO"; devolucoes: number }
  | { situacao: "DEVOLVIDO_PARA_AJUSTE"; devolucoes: number; devolvidoEm?: Date }
  | { situacao: "APROVADO"; devolucoes: number };

function sortearRoteiro(aberto: boolean): Roteiro | null {
  const dado = sorteio.numero();
  const devolucoes = sorteio.chance(0.25) ? (sorteio.chance(0.2) ? 2 : 1) : 0;
  if (aberto) {
    if (dado < 0.25) return null;
    if (dado < 0.45) return { situacao: "RASCUNHO" };
    if (dado < 0.7) return { situacao: "AGUARDANDO_AVALIACAO", devolucoes };
    if (dado < 0.8) return { situacao: "DEVOLVIDO_PARA_AJUSTE", devolucoes: Math.max(1, devolucoes) };
    return { situacao: "APROVADO", devolucoes };
  }
  if (dado < 0.06) return null;
  if (dado < 0.1) return { situacao: "RASCUNHO" };
  if (dado < 0.14) return { situacao: "DEVOLVIDO_PARA_AJUSTE", devolucoes: Math.max(1, devolucoes) };
  if (dado < 0.17) return { situacao: "AGUARDANDO_AVALIACAO", devolucoes };
  return { situacao: "APROVADO", devolucoes };
}

type Evento = { tipo: TipoEvento; usuarioId: number; ocorridoEm: Date; justificativa?: string };

// A história do relatório, do rascunho à situação final. No período aberto
// tudo acontece até agora; no encerrado, criação, envios e devoluções ficam
// dentro do prazo e só a aprovação pode vir depois — avaliação não tem prazo.
function montarEventos(roteiro: Roteiro, periodo: Periodo, docenteId: number, avaliadorId: number): Evento[] {
  const agora = new Date();
  const inicio = new Date(periodo.abertura.getTime() + DIA);
  const fim = periodo.aberto ? new Date(agora.getTime() - HORA) : new Date(periodo.encerramento.getTime() - DIA);

  const tipos: TipoEvento[] = [TipoEvento.CRIACAO];
  if (roteiro.situacao !== "RASCUNHO") {
    tipos.push(TipoEvento.SUBMISSAO);
    for (let ciclo = 0; ciclo < roteiro.devolucoes; ciclo++) {
      tipos.push(TipoEvento.DEVOLUCAO, TipoEvento.SUBMISSAO);
    }
    if (roteiro.situacao === "DEVOLVIDO_PARA_AJUSTE") {
      tipos.pop(); // termina na devolução, sem o reenvio
    }
  }
  const aprovado = roteiro.situacao === "APROVADO";
  const noPrazo = instantesEntre(inicio, fim, tipos.length + (aprovado && periodo.aberto ? 1 : 0));

  const eventos: Evento[] = tipos.map((tipo, indice) => ({
    tipo,
    usuarioId: tipo === TipoEvento.DEVOLUCAO ? avaliadorId : docenteId,
    ocorridoEm: noPrazo[indice],
    justificativa: tipo === TipoEvento.DEVOLUCAO ? sorteio.item(JUSTIFICATIVAS) : undefined,
  }));

  if (roteiro.situacao === "DEVOLVIDO_PARA_AJUSTE" && roteiro.devolvidoEm) {
    eventos[eventos.length - 1].ocorridoEm = roteiro.devolvidoEm;
  }
  if (aprovado) {
    const ultimoEnvio = eventos[eventos.length - 1].ocorridoEm;
    const aprovadoEm = periodo.aberto
      ? noPrazo[noPrazo.length - 1]
      : new Date(ultimoEnvio.getTime() + sorteio.inteiro(1, 12) * DIA + sorteio.inteiro(8, 18) * HORA);
    eventos.push({ tipo: TipoEvento.APROVACAO, usuarioId: avaliadorId, ocorridoEm: aprovadoEm });
  }
  return eventos;
}

function sortearItens(tipos: { id: number; descricao: string }[]) {
  return Array.from({ length: sorteio.inteiro(1, 4) }, () => {
    const tipo = sorteio.item(tipos);
    const horas = sorteio.inteiro(2, 12) / 2;
    const inicio = sorteio.inteiro(7, 22 - Math.ceil(horas));
    return {
      tipoAtividadeId: tipo.id,
      horas,
      diaSemana: sorteio.item(DIAS),
      horario: formatarHorario(inicio, horas),
      descricao: sorteio.item(DESCRICOES[tipo.descricao] ?? ["Atividade realizada no período."]),
    };
  });
}

async function criarRelatorio(
  chave: { docenteId: number; cursoId: number; periodo: Periodo },
  roteiro: Roteiro,
  avaliadorId: number,
  tipos: { id: number; descricao: string }[],
) {
  const itens = sortearItens(tipos);
  // Somado em centésimos, como no serviço de itens.
  const total = itens.reduce((soma, item) => soma + Math.round(item.horas * 100), 0) / 100;
  const eventos = montarEventos(roteiro, chave.periodo, chave.docenteId, avaliadorId);
  const criadoEm = eventos[0].ocorridoEm;
  const ultimo = eventos[eventos.length - 1].ocorridoEm;

  await prisma.$transaction(async (tx) => {
    const relatorio = await tx.relatorio.create({
      data: {
        docenteId: chave.docenteId,
        cursoId: chave.cursoId,
        periodoLetivoId: chave.periodo.id,
        cargaHorariaTotal: total,
        criadoEm,
        atualizadoEm: criadoEm,
        itens: { create: itens },
      },
    });
    await tx.eventoAuditoria.createMany({
      data: eventos.map((evento) => ({ ...evento, relatorioId: relatorio.id })),
    });
    // Por último: depois de APROVADO, o banco não aceita mais nada na linha.
    await tx.relatorio.update({
      where: { id: relatorio.id },
      data: { situacao: SituacaoRelatorio[roteiro.situacao], atualizadoEm: ultimo },
    });
  });
}

async function criarUsuario(nome: string, email: string, perfis: Perfil[], ativo = true) {
  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: { nome, ativo },
    create: { nome, email, ativo },
  });
  for (const perfil of perfis) {
    await prisma.usuarioPerfil.upsert({
      where: { usuarioId_perfil: { usuarioId: usuario.id, perfil } },
      update: {},
      create: { usuarioId: usuario.id, perfil },
    });
  }
  return usuario;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dados de exemplo não rodam em produção.");
  }
  if ((await prisma.relatorio.count()) > 0) {
    throw new Error(
      "O banco já tem relatórios, e o cenário de exemplo é montado do zero. " +
        "Rode antes: npx prisma migrate reset --force",
    );
  }

  await seed();

  const porEmail = async (email: string) => prisma.usuario.findUniqueOrThrow({ where: { email } });
  const [helena, claudia, marcos, paulo] = await Promise.all([
    porEmail("helena@baraodemaua.br"),
    porEmail("claudia@baraodemaua.br"),
    porEmail("marcos@baraodemaua.br"),
    porEmail("paulo@baraodemaua.br"),
  ]);

  // Cursos: os três do seed e mais sete.
  for (const nome of CURSOS_NOVOS) {
    await prisma.curso.upsert({ where: { nome }, update: {}, create: { nome } });
  }
  const cursos = await prisma.curso.findMany({ orderBy: { id: "asc" } });
  const cursoId = (nome: string) => cursos.find((curso) => curso.nome === nome)!.id;

  // Coordenadores na ordem de cadastro do vínculo — é ela que decide o avaliador.
  const coordenadorPorCurso = new Map<number, { id: number; ativo: boolean }[]>([
    [cursoId("Fisioterapia"), [{ id: claudia.id, ativo: true }]],
    [cursoId("Nutrição"), [{ id: marcos.id, ativo: true }]],
    [cursoId("Educação Física"), [{ id: paulo.id, ativo: true }]],
  ]);
  for (const coordenador of COORDENADORES_NOVOS) {
    const email = `${semAcento(coordenador.nome).toLowerCase().replace(" ", ".")}@baraodemaua.br`;
    const usuario = await criarUsuario(coordenador.nome, email, [Perfil.COORDENADOR], coordenador.ativo ?? true);
    const id = cursoId(coordenador.curso);
    await prisma.vinculoCoordenadorCurso.create({ data: { coordenadorId: usuario.id, cursoId: id } });
    coordenadorPorCurso.set(id, [...(coordenadorPorCurso.get(id) ?? []), { id: usuario.id, ativo: usuario.ativo }]);
  }

  // Avaliador de quando o relatório foi avaliado: Rogério coordenou Direito
  // até 2025 e foi inativado depois; nos períodos dele, é quem aprova.
  const rogerio = await porEmail("rogerio.antunes@baraodemaua.br");
  function avaliadorDe(idCurso: number, periodo: Periodo): number {
    const lista = coordenadorPorCurso.get(idCurso)!;
    if (lista.some((coordenador) => coordenador.id === rogerio.id) && periodo.ano < 2026) {
      return rogerio.id;
    }
    return lista.find((coordenador) => coordenador.ativo)!.id;
  }

  // Docentes novos, cada um com um ou dois cursos fixos entre os períodos.
  // O último é inativado: tem histórico, mas nenhum vínculo no período aberto.
  const usados = new Set([helena.nome, claudia.nome, marcos.nome, paulo.nome]);
  const docentes: { id: number; cursos: number[]; ativo: boolean }[] = [
    { id: helena.id, cursos: [cursoId("Fisioterapia"), cursoId("Nutrição")], ativo: true },
    { id: paulo.id, cursos: [cursoId("Educação Física")], ativo: true },
  ];
  for (let indice = 0; indice < QUANTIDADE_DOCENTES_NOVOS; indice++) {
    let nome: string;
    do {
      nome = `${sorteio.item(PRENOMES)} ${sorteio.item(SOBRENOMES)}`;
    } while (usados.has(nome));
    usados.add(nome);
    const ativo = indice < QUANTIDADE_DOCENTES_NOVOS - 1;
    const email = `${semAcento(nome).toLowerCase().replace(" ", ".")}@baraodemaua.br`;
    const usuario = await criarUsuario(nome, email, [Perfil.DOCENTE], ativo);
    const principal = sorteio.item(cursos).id;
    const segundo = sorteio.chance(0.3) ? sorteio.item(cursos.filter((curso) => curso.id !== principal)).id : null;
    docentes.push({ id: usuario.id, cursos: segundo ? [principal, segundo] : [principal], ativo });
  }

  // Períodos: o aberto vem do seed; os três anteriores são criados aqui.
  const aberto = await prisma.periodoLetivo.findFirstOrThrow({ orderBy: [{ ano: "desc" }, { semestre: "desc" }] });
  const periodos: Periodo[] = [
    {
      id: aberto.id,
      ano: aberto.ano,
      semestre: aberto.semestre,
      abertura: aberto.aberturaSubmissao,
      encerramento: aberto.encerramentoSubmissao,
      aberto: true,
    },
  ];
  let anterior = { ano: aberto.ano, semestre: aberto.semestre };
  for (let passo = 0; passo < 3; passo++) {
    anterior = periodoAnterior(anterior.ano, anterior.semestre);
    const prazos = prazosDoPeriodo(anterior.ano, anterior.semestre);
    const criado = await prisma.periodoLetivo.create({ data: { ...anterior, ...prazos } });
    periodos.push({
      id: criado.id,
      ano: criado.ano,
      semestre: criado.semestre,
      abertura: criado.aberturaSubmissao,
      encerramento: criado.encerramentoSubmissao,
      aberto: false,
    });
  }
  periodos.reverse(); // do mais antigo ao aberto, para os ids seguirem a cronologia

  const tipos = await prisma.tipoAtividade.findMany({ where: { ativo: true } });
  const anteriorAoAberto = periodos[periodos.length - 2];

  for (const periodo of periodos) {
    for (const docente of docentes) {
      if (periodo.aberto && !docente.ativo) continue;
      const fixo = docente.id === helena.id || docente.id === paulo.id;
      // Um ou outro docente fica de fora de um período (licença, contratação).
      if (!fixo && sorteio.chance(0.1)) continue;

      for (const idCurso of docente.cursos) {
        await prisma.vinculoDocenteCurso.upsert({
          where: {
            docenteId_cursoId_periodoLetivoId: { docenteId: docente.id, cursoId: idCurso, periodoLetivoId: periodo.id },
          },
          update: {},
          create: { docenteId: docente.id, cursoId: idCurso, periodoLetivoId: periodo.id },
        });

        let roteiro = sortearRoteiro(periodo.aberto);
        // Casos fixos dos usuários do login falso, para cada tela ter o que mostrar.
        if (docente.id === helena.id) {
          if (periodo.aberto) {
            roteiro = idCurso === cursoId("Fisioterapia") ? { situacao: "RASCUNHO" } : null;
          } else if (periodo === anteriorAoAberto && idCurso === cursoId("Nutrição")) {
            // Devolvida há três dias num período já encerrado: ainda no prazo
            // extra, aparece na home dela.
            roteiro = { situacao: "DEVOLVIDO_PARA_AJUSTE", devolucoes: 1, devolvidoEm: new Date(Date.now() - 3 * DIA) };
          } else {
            roteiro = { situacao: "APROVADO", devolucoes: 0 };
          }
        }
        if (docente.id === paulo.id) {
          // Autoaprovação nos encerrados; no aberto, aguardando na própria fila.
          roteiro = periodo.aberto
            ? { situacao: "AGUARDANDO_AVALIACAO", devolucoes: 0 }
            : { situacao: "APROVADO", devolucoes: 0 };
        }
        if (!roteiro) continue;

        await criarRelatorio(
          { docenteId: docente.id, cursoId: idCurso, periodo },
          roteiro,
          avaliadorDe(idCurso, periodo),
          tipos,
        );
      }
    }
  }

  const [usuarios, vinculos, porSituacao] = await Promise.all([
    prisma.usuario.count(),
    prisma.vinculoDocenteCurso.count(),
    prisma.relatorio.groupBy({ by: ["situacao"], _count: true }),
  ]);
  console.log(
    [
      "",
      `Dados de exemplo prontos: ${usuarios} usuários, ${cursos.length} cursos, ${periodos.length} períodos, ${vinculos} vínculos docente-curso.`,
      ...porSituacao.map((linha) => `  ${linha.situacao.padEnd(22)} ${linha._count}`),
      "Além dos logins do seed acima:",
      "  beatriz.lacerda@baraodemaua.br  coordena Direito (Rogério, inativado, vem antes dela na ordem)",
      "  renata.albuquerque@baraodemaua.br  coordena Administração",
    ].join("\n"),
  );
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
