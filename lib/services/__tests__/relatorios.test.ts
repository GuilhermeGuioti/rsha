import { prisma } from "../../db";
import { obterRelatorioAprovadoParaPdf } from "../relatorios";
import { submeter, aprovar, devolver } from "../workflow";
import { salvarItens } from "../itens";
import { DiaSemana, Perfil, TipoEvento } from "../../../generated/prisma/client";

async function limpar() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "EventoAuditoria", "ItemAtividade", "Relatorio", "VinculoCoordenadorCurso", "VinculoDocenteCurso", "TipoAtividade", "PeriodoLetivo", "Curso", "UsuarioPerfil", "Usuario" RESTART IDENTITY CASCADE`,
  );
}

async function obterAmbiente() {
  const [docente, coordenador] = await Promise.all([
    prisma.usuario.create({ data: { nome: "Ana Gonçalves", email: "ana@srha.dev" } }),
    prisma.usuario.create({ data: { nome: "Carlos Coordenador", email: "carlos@srha.dev" } }),
  ]);
  await Promise.all([
    prisma.usuarioPerfil.create({ data: { usuarioId: docente.id, perfil: Perfil.DOCENTE } }),
    prisma.usuarioPerfil.create({ data: { usuarioId: coordenador.id, perfil: Perfil.COORDENADOR } }),
  ]);

  const curso = await prisma.curso.create({ data: { nome: "Ciência da Computação" } });
  const periodo = await prisma.periodoLetivo.create({
    data: {
      ano: 2026,
      semestre: 2,
      aberturaSubmissao: new Date("2026-08-01T00:00:00Z"),
      encerramentoSubmissao: new Date("2026-12-15T23:59:59Z"),
    },
  });
  const [orientacao, extensao] = await Promise.all([
    prisma.tipoAtividade.create({ data: { descricao: "Orientação de TCC" } }),
    prisma.tipoAtividade.create({ data: { descricao: "Projeto de extensão" } }),
  ]);

  await Promise.all([
    prisma.vinculoDocenteCurso.create({
      data: { docenteId: docente.id, cursoId: curso.id, periodoLetivoId: periodo.id },
    }),
    prisma.vinculoCoordenadorCurso.create({ data: { coordenadorId: coordenador.id, cursoId: curso.id } }),
  ]);

  const relatorio = await prisma.relatorio.create({
    data: { docenteId: docente.id, cursoId: curso.id, periodoLetivoId: periodo.id },
  });
  await prisma.eventoAuditoria.create({
    data: { relatorioId: relatorio.id, tipo: TipoEvento.CRIACAO, usuarioId: docente.id },
  });
  await salvarItens(relatorio.id, [
    {
      tipoAtividadeId: orientacao.id,
      horas: 4,
      diaSemana: DiaSemana.TERCA,
      horario: "14:00–18:00",
      descricao: "Orientação de dois trabalhos de conclusão.",
    },
    {
      tipoAtividadeId: extensao.id,
      horas: 2.5,
      diaSemana: DiaSemana.QUINTA,
      horario: "09:00–11:30",
      descricao: "Projeto de extensão na comunidade.",
    },
  ]);

  return { docente, coordenador, relatorioId: relatorio.id };
}

beforeEach(limpar);
afterAll(() => prisma.$disconnect());

// Congela o relógio dentro do prazo do período do cenário — submeter fora do
// prazo é bloqueado pelo workflow.
beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick"] }).setSystemTime(new Date("2026-10-01T12:00:00Z"));
});
afterAll(() => jest.useRealTimers());

test("relatório aprovado exporta itens, total e dados de aprovação", async () => {
  const { docente, coordenador, relatorioId } = await obterAmbiente();
  await submeter(relatorioId, docente.id);
  await aprovar(relatorioId, coordenador.id);

  const dados = await obterRelatorioAprovadoParaPdf(relatorioId);

  expect(dados.docente).toBe("Ana Gonçalves");
  expect(dados.curso).toBe("Ciência da Computação");
  expect(dados.ano).toBe(2026);
  expect(dados.semestre).toBe(2);
  expect(dados.itens.map((item) => item.tipoAtividade)).toEqual([
    "Orientação de TCC",
    "Projeto de extensão",
  ]);
  // number, nunca o Decimal do Prisma — o dado atravessa para a rota.
  expect(dados.cargaHorariaTotal).toBe(6.5);
  expect(typeof dados.cargaHorariaTotal).toBe("number");
  expect(dados.aprovadoPor).toBe("Carlos Coordenador");
  expect(dados.aprovadoEm).toBeInstanceOf(Date);
});

test("a trilha exportada vem em ordem cronológica, do primeiro evento ao último", async () => {
  const { docente, coordenador, relatorioId } = await obterAmbiente();
  await submeter(relatorioId, docente.id);
  await devolver(relatorioId, coordenador.id, "Falta detalhar o horário da extensão.");
  await submeter(relatorioId, docente.id);
  await aprovar(relatorioId, coordenador.id);

  const dados = await obterRelatorioAprovadoParaPdf(relatorioId);

  expect(dados.eventos.map((evento) => evento.tipo)).toEqual([
    TipoEvento.CRIACAO,
    TipoEvento.SUBMISSAO,
    TipoEvento.DEVOLUCAO,
    TipoEvento.SUBMISSAO,
    TipoEvento.APROVACAO,
  ]);
  expect(dados.eventos[2].justificativa).toBe("Falta detalhar o horário da extensão.");
});

test("a data de envio exportada é a do último envio, o que foi aprovado", async () => {
  const { docente, coordenador, relatorioId } = await obterAmbiente();
  await submeter(relatorioId, docente.id);
  await devolver(relatorioId, coordenador.id, "Falta detalhar o horário da extensão.");
  jest.setSystemTime(new Date("2026-10-03T15:00:00Z"));
  await submeter(relatorioId, docente.id);
  jest.setSystemTime(new Date("2026-10-05T13:30:00Z"));
  await aprovar(relatorioId, coordenador.id);
  jest.setSystemTime(new Date("2026-10-01T12:00:00Z"));

  const dados = await obterRelatorioAprovadoParaPdf(relatorioId);

  expect(dados.enviadoEm).toEqual(new Date("2026-10-03T15:00:00Z"));
  expect(dados.aprovadoEm).toEqual(new Date("2026-10-05T13:30:00Z"));
});

test("relatório que não está aprovado não é exportável", async () => {
  const { docente, relatorioId } = await obterAmbiente();

  await expect(obterRelatorioAprovadoParaPdf(relatorioId)).rejects.toThrow(
    "Só relatório aprovado pode ser exportado em PDF.",
  );

  await submeter(relatorioId, docente.id);
  await expect(obterRelatorioAprovadoParaPdf(relatorioId)).rejects.toThrow(
    "Só relatório aprovado pode ser exportado em PDF.",
  );
});

test("relatório inexistente não é exportável", async () => {
  await expect(obterRelatorioAprovadoParaPdf(9999)).rejects.toThrow("Relatório não encontrado.");
});
