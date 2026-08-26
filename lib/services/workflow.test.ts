import { prisma } from "../db";
import { submeter, aprovar, devolver } from "./workflow";
import { adicionarItem, removerItem } from "./itens";
import { DiaSemana, Perfil, SituacaoRelatorio, TipoEvento } from "../../app/generated/prisma/client";

async function limpar() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "EventoAuditoria", "ItemAtividade", "Relatorio", "VinculoCoordenadorCurso", "VinculoDocenteCurso", "TipoAtividade", "PeriodoLetivo", "Curso", "UsuarioPerfil", "Usuario" RESTART IDENTITY CASCADE`,
  );
}

// Cenário próprio da suíte, desacoplado de prisma/seed.ts (que só cria o
// admin inicial — o resto é cadastrado pelo admin via UI, não pelo seed).
async function obterAmbiente() {
  const [docente, coordenador, coordenadorDocente] = await Promise.all([
    prisma.usuario.create({ data: { nome: "Docente Teste", email: "docente@srha.dev" } }),
    prisma.usuario.create({ data: { nome: "Coordenador Teste", email: "coordenador@srha.dev" } }),
    prisma.usuario.create({
      data: { nome: "Coordenador Docente Teste", email: "coordenador.docente@srha.dev" },
    }),
  ]);

  await Promise.all([
    prisma.usuarioPerfil.create({ data: { usuarioId: docente.id, perfil: Perfil.DOCENTE } }),
    prisma.usuarioPerfil.create({ data: { usuarioId: coordenador.id, perfil: Perfil.COORDENADOR } }),
    prisma.usuarioPerfil.create({ data: { usuarioId: coordenadorDocente.id, perfil: Perfil.COORDENADOR } }),
    prisma.usuarioPerfil.create({ data: { usuarioId: coordenadorDocente.id, perfil: Perfil.DOCENTE } }),
  ]);

  const [cursoEngSoftware, cursoCienciaComp, cursoSistemasInfo] = await Promise.all([
    prisma.curso.create({
      data: { nome: "Engenharia de Software", avaliadorAlternativoId: coordenador.id },
    }),
    prisma.curso.create({ data: { nome: "Ciência da Computação" } }),
    prisma.curso.create({ data: { nome: "Sistemas de Informação" } }),
  ]);

  const periodo = await prisma.periodoLetivo.create({
    data: {
      ano: 2026,
      semestre: 2,
      aberturaSubmissao: new Date("2026-08-01T00:00:00Z"),
      encerramentoSubmissao: new Date("2026-12-15T23:59:59Z"),
    },
  });

  const tipoAtividade = await prisma.tipoAtividade.create({ data: { descricao: "Orientação de TCC" } });

  await Promise.all([
    prisma.vinculoDocenteCurso.create({
      data: { docenteId: docente.id, cursoId: cursoCienciaComp.id, periodoLetivoId: periodo.id },
    }),
    prisma.vinculoDocenteCurso.create({
      data: { docenteId: docente.id, cursoId: cursoSistemasInfo.id, periodoLetivoId: periodo.id },
    }),
    prisma.vinculoDocenteCurso.create({
      data: { docenteId: coordenadorDocente.id, cursoId: cursoEngSoftware.id, periodoLetivoId: periodo.id },
    }),
    prisma.vinculoCoordenadorCurso.create({
      data: { coordenadorId: coordenador.id, cursoId: cursoCienciaComp.id },
    }),
    prisma.vinculoCoordenadorCurso.create({
      data: { coordenadorId: coordenadorDocente.id, cursoId: cursoEngSoftware.id },
    }),
  ]);

  return {
    docente,
    coordenador,
    coordenadorDocente,
    cursoEngSoftware,
    cursoCienciaComp,
    cursoSistemasInfo,
    periodo,
    tipoAtividade,
  };
}

beforeEach(async () => {
  await limpar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("docente vinculado a dois cursos gera dois relatórios independentes, roteados a coordenadores diferentes", async () => {
  const ambiente = await obterAmbiente();

  const coordenadorSistemas = await prisma.usuario.create({
    data: { nome: "Coordenador Sistemas Teste", email: "coordenador.sistemas@srha.dev" },
  });
  await prisma.vinculoCoordenadorCurso.create({
    data: { coordenadorId: coordenadorSistemas.id, cursoId: ambiente.cursoSistemasInfo.id },
  });

  const relatorioCC = await prisma.relatorio.create({
    data: {
      docenteId: ambiente.docente.id,
      cursoId: ambiente.cursoCienciaComp.id,
      periodoLetivoId: ambiente.periodo.id,
    },
  });
  const relatorioSI = await prisma.relatorio.create({
    data: {
      docenteId: ambiente.docente.id,
      cursoId: ambiente.cursoSistemasInfo.id,
      periodoLetivoId: ambiente.periodo.id,
    },
  });

  await submeter(relatorioCC.id, ambiente.docente.id);
  await submeter(relatorioSI.id, ambiente.docente.id);

  await expect(aprovar(relatorioSI.id, ambiente.coordenador.id)).rejects.toThrow();
  await expect(aprovar(relatorioCC.id, coordenadorSistemas.id)).rejects.toThrow();

  await aprovar(relatorioCC.id, ambiente.coordenador.id);
  await aprovar(relatorioSI.id, coordenadorSistemas.id);

  const [ccFinal, siFinal] = await Promise.all([
    prisma.relatorio.findUniqueOrThrow({ where: { id: relatorioCC.id } }),
    prisma.relatorio.findUniqueOrThrow({ where: { id: relatorioSI.id } }),
  ]);
  expect(ccFinal.situacao).toBe(SituacaoRelatorio.APROVADO);
  expect(siFinal.situacao).toBe(SituacaoRelatorio.APROVADO);
});

test("coordenador não consegue aprovar relatório do qual é autor", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await prisma.relatorio.create({
    data: {
      docenteId: ambiente.coordenadorDocente.id,
      cursoId: ambiente.cursoEngSoftware.id,
      periodoLetivoId: ambiente.periodo.id,
    },
  });

  await submeter(relatorio.id, ambiente.coordenadorDocente.id);

  await expect(aprovar(relatorio.id, ambiente.coordenadorDocente.id)).rejects.toThrow();

  await aprovar(relatorio.id, ambiente.coordenador.id);
  const final = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(final.situacao).toBe(SituacaoRelatorio.APROVADO);
});

test("coordenador não enxerga relatório de curso que não é dele", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await prisma.relatorio.create({
    data: {
      docenteId: ambiente.docente.id,
      cursoId: ambiente.cursoCienciaComp.id,
      periodoLetivoId: ambiente.periodo.id,
    },
  });
  await submeter(relatorio.id, ambiente.docente.id);

  await expect(aprovar(relatorio.id, ambiente.coordenadorDocente.id)).rejects.toThrow();
  await expect(devolver(relatorio.id, ambiente.coordenadorDocente.id, "fora de escopo")).rejects.toThrow();
});

test("submissão fora do prazo é bloqueada", async () => {
  const ambiente = await obterAmbiente();
  const periodoEncerrado = await prisma.periodoLetivo.create({
    data: {
      ano: 2025,
      semestre: 2,
      aberturaSubmissao: new Date("2025-08-01T00:00:00Z"),
      encerramentoSubmissao: new Date("2025-12-15T23:59:59Z"),
    },
  });
  const relatorio = await prisma.relatorio.create({
    data: {
      docenteId: ambiente.docente.id,
      cursoId: ambiente.cursoCienciaComp.id,
      periodoLetivoId: periodoEncerrado.id,
    },
  });

  await expect(submeter(relatorio.id, ambiente.docente.id)).rejects.toThrow();

  const final = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(final.situacao).toBe(SituacaoRelatorio.RASCUNHO);
});

test("devolução sem justificativa é bloqueada", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await prisma.relatorio.create({
    data: {
      docenteId: ambiente.docente.id,
      cursoId: ambiente.cursoCienciaComp.id,
      periodoLetivoId: ambiente.periodo.id,
    },
  });
  await submeter(relatorio.id, ambiente.docente.id);

  await expect(devolver(relatorio.id, ambiente.coordenador.id, "")).rejects.toThrow();
  await expect(devolver(relatorio.id, ambiente.coordenador.id, "   ")).rejects.toThrow();

  const final = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(final.situacao).toBe(SituacaoRelatorio.AGUARDANDO_AVALIACAO);
});

test("após submeter → devolver → submeter → aprovar, a auditoria tem quatro eventos em ordem cronológica", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await prisma.relatorio.create({
    data: {
      docenteId: ambiente.docente.id,
      cursoId: ambiente.cursoCienciaComp.id,
      periodoLetivoId: ambiente.periodo.id,
    },
  });

  await submeter(relatorio.id, ambiente.docente.id);
  await devolver(relatorio.id, ambiente.coordenador.id, "Ajustar horas de TCC.");
  await submeter(relatorio.id, ambiente.docente.id);
  await aprovar(relatorio.id, ambiente.coordenador.id);

  const eventos = await prisma.eventoAuditoria.findMany({
    where: { relatorioId: relatorio.id },
    orderBy: { ocorridoEm: "asc" },
  });

  expect(eventos.map((evento) => evento.tipo)).toEqual([
    TipoEvento.SUBMISSAO,
    TipoEvento.DEVOLUCAO,
    TipoEvento.SUBMISSAO,
    TipoEvento.APROVACAO,
  ]);
  for (let i = 1; i < eventos.length; i++) {
    expect(eventos[i].ocorridoEm.getTime()).toBeGreaterThanOrEqual(eventos[i - 1].ocorridoEm.getTime());
  }
});

test("cargaHorariaTotal bate com a soma dos itens após adicionar e remover item", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await prisma.relatorio.create({
    data: {
      docenteId: ambiente.docente.id,
      cursoId: ambiente.cursoCienciaComp.id,
      periodoLetivoId: ambiente.periodo.id,
    },
  });

  const dadosItem = (horas: number) => ({
    tipoAtividadeId: ambiente.tipoAtividade.id,
    horas,
    diaSemana: DiaSemana.SEGUNDA,
    horario: "14:00-16:00",
    descricao: "Orientação de TCC",
  });

  await adicionarItem(relatorio.id, dadosItem(2));
  await adicionarItem(relatorio.id, dadosItem(3.5));

  let atual = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(atual.cargaHorariaTotal.toNumber()).toBe(5.5);

  const itens = await prisma.itemAtividade.findMany({ where: { relatorioId: relatorio.id } });
  await removerItem(relatorio.id, itens[0].id);

  atual = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  const restantes = await prisma.itemAtividade.findMany({ where: { relatorioId: relatorio.id } });
  const somaEsperada = restantes.reduce((soma, item) => soma + item.horas.toNumber(), 0);
  expect(atual.cargaHorariaTotal.toNumber()).toBe(somaEsperada);
});

test("relatório aprovado não aceita alteração por nenhum caminho", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await prisma.relatorio.create({
    data: {
      docenteId: ambiente.docente.id,
      cursoId: ambiente.cursoCienciaComp.id,
      periodoLetivoId: ambiente.periodo.id,
    },
  });
  await adicionarItem(relatorio.id, {
    tipoAtividadeId: ambiente.tipoAtividade.id,
    horas: 4,
    diaSemana: DiaSemana.TERCA,
    horario: "10:00-12:00",
    descricao: "Orientação de TCC",
  });
  await submeter(relatorio.id, ambiente.docente.id);
  await aprovar(relatorio.id, ambiente.coordenador.id);

  await expect(submeter(relatorio.id, ambiente.docente.id)).rejects.toThrow();
  await expect(aprovar(relatorio.id, ambiente.coordenador.id)).rejects.toThrow();
  await expect(devolver(relatorio.id, ambiente.coordenador.id, "tentativa após aprovado")).rejects.toThrow();
  await expect(
    adicionarItem(relatorio.id, {
      tipoAtividadeId: ambiente.tipoAtividade.id,
      horas: 1,
      diaSemana: DiaSemana.QUARTA,
      horario: "08:00-09:00",
      descricao: "Nova tentativa",
    }),
  ).rejects.toThrow();

  const itemExistente = await prisma.itemAtividade.findFirstOrThrow({ where: { relatorioId: relatorio.id } });
  await expect(removerItem(relatorio.id, itemExistente.id)).rejects.toThrow();

  const final = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(final.situacao).toBe(SituacaoRelatorio.APROVADO);
  expect(final.cargaHorariaTotal.toNumber()).toBe(4);
});
