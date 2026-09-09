import "dotenv/config";
import { prisma } from "../lib/db";
import { seed } from "./seed";
import { Perfil, DiaSemana, SituacaoRelatorio, TipoEvento } from "../generated/prisma/enums";

/**
 * Carga de dados PROVISÓRIA para testar o sistema inteiro com volume
 * parecido com produção (302 docentes, 17 coordenadores, 25 cursos — números
 * do CLAUDE.md) e relatórios em todos os estados possíveis, espalhados por
 * vários períodos letivos (passados e o corrente).
 *
 * Não faz parte do seed oficial (prisma/seed.ts) — este arquivo é só para
 * este teste manual. Depois de usar, "docker compose down -v" e "up" de novo
 * apaga tudo, e este arquivo pode ser removido.
 *
 * Rodar com: npx tsx prisma/carga-teste.ts
 */

const NOMES = [
  "Ana", "Bruno", "Carla", "Diego", "Elaine", "Fábio", "Gabriela", "Henrique",
  "Isabela", "João", "Karina", "Leonardo", "Mariana", "Nelson", "Otávio",
  "Patrícia", "Rafael", "Sabrina", "Tiago", "Vanessa", "Wagner", "Yasmin",
  "Alessandro", "Beatriz", "Cauê", "Daniela", "Eduardo", "Fernanda", "Gustavo",
  "Helena", "Igor", "Juliana", "Lucas", "Marcela", "Nicolas", "Olívia",
];

const SOBRENOMES = [
  "Almeida", "Barros", "Cardoso", "Duarte", "Esteves", "Ferraz", "Gouveia",
  "Holanda", "Iglesias", "Junqueira", "Kowalski", "Lacerda", "Machado",
  "Nogueira", "Oliveira", "Pimenta", "Queiroz", "Ramalho", "Salgado",
  "Teodoro", "Uchôa", "Valente", "Winter", "Xavier", "Zanetti", "Andrade",
  "Bezerra", "Coutinho", "Dornelles", "Espósito",
];

const CURSOS_EXTRA = [
  "Enfermagem", "Psicologia", "Direito", "Administração", "Ciências Contábeis",
  "Engenharia Civil", "Engenharia de Produção", "Ciência da Computação",
  "Sistemas de Informação", "Pedagogia", "Letras", "Farmácia", "Odontologia",
  "Medicina Veterinária", "Arquitetura e Urbanismo", "Design de Interiores",
  "Gastronomia", "Turismo", "Publicidade e Propaganda", "Serviço Social",
  "Biomedicina", "Fonoaudiologia",
];

const PERIODOS_EXTRA = [
  { ano: 2024, semestre: 1, abertura: "2024-02-01", encerramento: "2024-07-10" },
  { ano: 2024, semestre: 2, abertura: "2024-08-01", encerramento: "2024-12-10" },
  { ano: 2025, semestre: 1, abertura: "2025-02-01", encerramento: "2025-07-10" },
  { ano: 2025, semestre: 2, abertura: "2025-08-01", encerramento: "2025-12-10" },
  { ano: 2026, semestre: 1, abertura: "2026-02-01", encerramento: "2026-07-10" },
];

const HORARIOS = ["07h-09h", "09h-11h", "14h-16h", "16h-18h", "19h-21h", "21h-22h40"];
const DESCRICOES = [
  "Orientação individual de TCC",
  "Reunião de acompanhamento de estágio",
  "Participação em reunião do NBE",
  "Correção de relatórios de estágio",
  "Encontro de orientação em grupo",
  "Visita técnica de supervisão de estágio",
];
const JUSTIFICATIVAS = [
  "Faltou detalhar o horário da atividade de orientação.",
  "A carga horária declarada não bate com o número de encontros descritos.",
  "O tipo de atividade está classificado errado — confira e corrija.",
  "Descrição muito genérica: detalhe o que foi feito em cada encontro.",
];

function aleatorioEntre(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function escolher<T>(lista: T[]): T {
  return lista[aleatorioEntre(0, lista.length - 1)];
}

function nomeAleatorio(): string {
  return `${escolher(NOMES)} ${escolher(SOBRENOMES)}`;
}

function dataAleatoriaEntre(inicio: Date, fim: Date): Date {
  const tempo = inicio.getTime() + Math.random() * Math.max(0, fim.getTime() - inicio.getTime());
  return new Date(tempo);
}

async function main() {
  // Garante a base oficial: tipos de atividade, secretaria, os 4 usuários
  // fixos do login de desenvolvimento, os 3 cursos e o período corrente.
  await seed();

  const tipos = await prisma.tipoAtividade.findMany();

  // --- cursos: os 3 do seed oficial + mais 22, total 25 ---
  const nomesCursos = ["Fisioterapia", "Nutrição", "Educação Física", ...CURSOS_EXTRA];
  for (const nome of nomesCursos) {
    await prisma.curso.upsert({ where: { nome }, update: {}, create: { nome } });
  }
  const cursos = await prisma.curso.findMany();

  // --- períodos: o corrente (já existe) + 5 encerrados, cobrindo 2024-2026 ---
  for (const p of PERIODOS_EXTRA) {
    await prisma.periodoLetivo.upsert({
      where: { ano_semestre: { ano: p.ano, semestre: p.semestre } },
      update: {},
      create: {
        ano: p.ano,
        semestre: p.semestre,
        aberturaSubmissao: new Date(p.abertura),
        encerramentoSubmissao: new Date(p.encerramento),
      },
    });
  }
  const periodos = await prisma.periodoLetivo.findMany();

  // --- coordenadores: claudia/marcos/paulo (já existem) + mais 14, total 17 ---
  const dadosCoordenadores = Array.from({ length: 14 }, (_, i) => ({
    nome: nomeAleatorio(),
    email: `coordenador${String(i + 1).padStart(2, "0")}@baraodemaua.br`,
  }));
  await prisma.usuario.createMany({ data: dadosCoordenadores, skipDuplicates: true });
  const coordenadoresNovos = await prisma.usuario.findMany({
    where: { email: { in: dadosCoordenadores.map((c) => c.email) } },
  });
  await prisma.usuarioPerfil.createMany({
    data: coordenadoresNovos.map((u) => ({ usuarioId: u.id, perfil: Perfil.COORDENADOR })),
    skipDuplicates: true,
  });
  const coordenadoresExistentes = await prisma.usuario.findMany({
    where: { email: { in: ["claudia@baraodemaua.br", "marcos@baraodemaua.br", "paulo@baraodemaua.br"] } },
  });
  const coordenadores = [...coordenadoresExistentes, ...coordenadoresNovos];

  // Fisioterapia/Nutrição/Educação Física já têm coordenador (seed oficial);
  // os outros 22 cursos recebem um coordenador cada, ciclando pela lista.
  const cursosSemCoordenador = cursos.filter((c) => !["Fisioterapia", "Nutrição", "Educação Física"].includes(c.nome));
  await prisma.vinculoCoordenadorCurso.createMany({
    data: cursosSemCoordenador.map((curso, i) => ({
      coordenadorId: coordenadores[i % coordenadores.length].id,
      cursoId: curso.id,
    })),
    skipDuplicates: true,
  });
  const todosVinculosCoord = await prisma.vinculoCoordenadorCurso.findMany({ orderBy: { id: "asc" } });
  const avaliadorPorCurso = new Map<number, number>();
  for (const v of todosVinculosCoord) {
    if (!avaliadorPorCurso.has(v.cursoId)) avaliadorPorCurso.set(v.cursoId, v.coordenadorId);
  }

  // --- docentes: helena (já existe) + mais 301, total 302 ---
  const dadosDocentes = Array.from({ length: 301 }, (_, i) => ({
    nome: nomeAleatorio(),
    email: `docente${String(i + 1).padStart(3, "0")}@baraodemaua.br`,
  }));
  await prisma.usuario.createMany({ data: dadosDocentes, skipDuplicates: true });
  const docentesNovos = await prisma.usuario.findMany({
    where: { email: { in: dadosDocentes.map((d) => d.email) } },
  });
  await prisma.usuarioPerfil.createMany({
    data: docentesNovos.map((u) => ({ usuarioId: u.id, perfil: Perfil.DOCENTE })),
    skipDuplicates: true,
  });
  const helena = await prisma.usuario.findUniqueOrThrow({ where: { email: "helena@baraodemaua.br" } });
  const docentes = [helena, ...docentesNovos];

  // --- vínculo docente-curso por período: a maioria dá 1 curso, uma fração dá 2 ---
  const dadosVinculoDocente: { docenteId: number; cursoId: number; periodoLetivoId: number }[] = [];
  for (const periodo of periodos) {
    for (const docente of docentes) {
      const qtdeCursos = Math.random() < 0.15 ? 2 : 1;
      const embaralhado = [...cursos].sort(() => Math.random() - 0.5).slice(0, qtdeCursos);
      for (const curso of embaralhado) {
        dadosVinculoDocente.push({ docenteId: docente.id, cursoId: curso.id, periodoLetivoId: periodo.id });
      }
    }
  }
  await prisma.vinculoDocenteCurso.createMany({ data: dadosVinculoDocente, skipDuplicates: true });
  const vinculos = await prisma.vinculoDocenteCurso.findMany({ include: { periodo: true } });

  // --- relatórios: nem todo vínculo tem um (isso é o "não entregue"); entre
  // os que têm, o estado varia conforme o período já ter encerrado ou não ---
  type Plano = {
    docenteId: number;
    cursoId: number;
    periodoLetivoId: number;
    situacao: SituacaoRelatorio;
    itens: { tipoAtividadeId: number; horas: number; diaSemana: DiaSemana; horario: string; descricao: string }[];
  };

  const diasSemana = Object.values(DiaSemana);
  function gerarItens(): Plano["itens"] {
    const qtde = aleatorioEntre(1, 3);
    return Array.from({ length: qtde }, () => ({
      tipoAtividadeId: escolher(tipos).id,
      horas: aleatorioEntre(4, 16) / 2,
      diaSemana: escolher(diasSemana),
      horario: escolher(HORARIOS),
      descricao: escolher(DESCRICOES),
    }));
  }

  const agora = new Date();
  const planos: Plano[] = [];
  for (const vinculo of vinculos) {
    const encerrado = vinculo.periodo.encerramentoSubmissao < agora;
    const chanceEntrega = encerrado ? 0.85 : 0.4;
    if (Math.random() > chanceEntrega) continue;

    const roleta = Math.random();
    const situacao: SituacaoRelatorio = encerrado
      ? roleta < 0.8
        ? SituacaoRelatorio.APROVADO
        : roleta < 0.9
          ? SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE
          : SituacaoRelatorio.RASCUNHO
      : roleta < 0.5
        ? SituacaoRelatorio.AGUARDANDO_AVALIACAO
        : roleta < 0.7
          ? SituacaoRelatorio.APROVADO
          : roleta < 0.85
            ? SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE
            : SituacaoRelatorio.RASCUNHO;

    planos.push({
      docenteId: vinculo.docenteId,
      cursoId: vinculo.cursoId,
      periodoLetivoId: vinculo.periodoLetivoId,
      situacao,
      itens: gerarItens(),
    });
  }

  await prisma.relatorio.createMany({
    data: planos.map((p) => ({
      docenteId: p.docenteId,
      cursoId: p.cursoId,
      periodoLetivoId: p.periodoLetivoId,
      situacao: p.situacao,
      cargaHorariaTotal: p.itens.reduce((soma, item) => soma + item.horas, 0),
    })),
    skipDuplicates: true,
  });

  const relatoriosCriados = await prisma.relatorio.findMany({
    select: { id: true, docenteId: true, cursoId: true, periodoLetivoId: true },
  });
  const idPorChave = new Map(
    relatoriosCriados.map((r) => [`${r.docenteId}:${r.cursoId}:${r.periodoLetivoId}`, r.id]),
  );

  const dadosItens: {
    relatorioId: number;
    tipoAtividadeId: number;
    horas: number;
    diaSemana: DiaSemana;
    horario: string;
    descricao: string;
  }[] = [];
  const dadosEventos: {
    relatorioId: number;
    tipo: TipoEvento;
    usuarioId: number;
    ocorridoEm: Date;
    justificativa?: string;
  }[] = [];

  for (const plano of planos) {
    const relatorioId = idPorChave.get(`${plano.docenteId}:${plano.cursoId}:${plano.periodoLetivoId}`)!;
    for (const item of plano.itens) {
      dadosItens.push({ relatorioId, ...item });
    }

    const periodo = periodos.find((p) => p.id === plano.periodoLetivoId)!;
    const avaliadorId = avaliadorPorCurso.get(plano.cursoId);
    if (!avaliadorId) continue;

    const janelaFim = periodo.encerramentoSubmissao < agora ? periodo.encerramentoSubmissao : agora;
    const criadoEm = dataAleatoriaEntre(periodo.aberturaSubmissao, janelaFim);
    dadosEventos.push({ relatorioId, tipo: TipoEvento.CRIACAO, usuarioId: plano.docenteId, ocorridoEm: criadoEm });

    if (plano.situacao === SituacaoRelatorio.RASCUNHO) continue;

    const submetidoEm = new Date(
      Math.min(criadoEm.getTime() + aleatorioEntre(1, 5) * 86_400_000, janelaFim.getTime()),
    );
    dadosEventos.push({ relatorioId, tipo: TipoEvento.SUBMISSAO, usuarioId: plano.docenteId, ocorridoEm: submetidoEm });

    if (plano.situacao === SituacaoRelatorio.AGUARDANDO_AVALIACAO) continue;

    if (plano.situacao === SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE) {
      const devolvidoEm = new Date(submetidoEm.getTime() + aleatorioEntre(1, 3) * 86_400_000);
      dadosEventos.push({
        relatorioId,
        tipo: TipoEvento.DEVOLUCAO,
        usuarioId: avaliadorId,
        ocorridoEm: devolvidoEm,
        justificativa: escolher(JUSTIFICATIVAS),
      });
      continue;
    }

    // APROVADO — uma fração passa por uma devolução antes, pra testar a
    // trilha de auditoria com mais de dois eventos.
    if (Math.random() < 0.25) {
      const devolvidoEm = new Date(submetidoEm.getTime() + aleatorioEntre(1, 3) * 86_400_000);
      dadosEventos.push({
        relatorioId,
        tipo: TipoEvento.DEVOLUCAO,
        usuarioId: avaliadorId,
        ocorridoEm: devolvidoEm,
        justificativa: escolher(JUSTIFICATIVAS),
      });
      const resubmetidoEm = new Date(devolvidoEm.getTime() + aleatorioEntre(1, 3) * 86_400_000);
      dadosEventos.push({
        relatorioId,
        tipo: TipoEvento.SUBMISSAO,
        usuarioId: plano.docenteId,
        ocorridoEm: resubmetidoEm,
      });
      const aprovadoEm = new Date(resubmetidoEm.getTime() + aleatorioEntre(1, 3) * 86_400_000);
      dadosEventos.push({ relatorioId, tipo: TipoEvento.APROVACAO, usuarioId: avaliadorId, ocorridoEm: aprovadoEm });
    } else {
      const aprovadoEm = new Date(submetidoEm.getTime() + aleatorioEntre(1, 4) * 86_400_000);
      dadosEventos.push({ relatorioId, tipo: TipoEvento.APROVACAO, usuarioId: avaliadorId, ocorridoEm: aprovadoEm });
    }
  }

  await prisma.itemAtividade.createMany({ data: dadosItens });
  await prisma.eventoAuditoria.createMany({ data: dadosEventos });

  console.log(
    [
      "Carga de teste concluída (PROVISÓRIA — reset com docker compose down -v quando terminar):",
      `  ${cursos.length} cursos`,
      `  ${periodos.length} períodos letivos`,
      `  ${coordenadores.length} coordenadores, ${docentes.length} docentes`,
      `  ${dadosVinculoDocente.length} vínculos docente-curso`,
      `  ${planos.length} relatórios (de ${vinculos.length} vínculos possíveis)`,
      `  ${dadosItens.length} itens de atividade`,
      `  ${dadosEventos.length} eventos de auditoria`,
    ].join("\n"),
  );
}

if (require.main === module) {
  main()
    .catch((erro) => {
      console.error(erro);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
