import { prisma } from "../../db";
import { submeter, aprovar, devolver, obterOuCriarRascunho } from "../workflow";
import { salvarItens } from "../itens";
import { DiaSemana, Perfil, SituacaoRelatorio, TipoEvento } from "../../../generated/prisma/client";

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
    prisma.curso.create({ data: { nome: "Engenharia de Software" } }),
    prisma.curso.create({ data: { nome: "Ciência da Computação" } }),
    prisma.curso.create({ data: { nome: "Sistemas de Informação" } }),
  ]);

  // Janela aberta em torno de agora: com datas fixas, a suíte inteira passaria
  // a falhar sozinha no dia seguinte ao encerramento.
  const agora = Date.now();
  const periodo = await prisma.periodoLetivo.create({
    data: {
      ano: 2026,
      semestre: 2,
      aberturaSubmissao: new Date(agora - 30 * 86_400_000),
      encerramentoSubmissao: new Date(agora + 30 * 86_400_000),
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

// Submeter exige ao menos um item (RF05): os cenários do workflow nascem
// com um item de 2 h e o total já coerente com ele.
function criarRelatorioComItem(
  ambiente: Awaited<ReturnType<typeof obterAmbiente>>,
  chave: { docenteId: number; cursoId: number; periodoLetivoId: number },
) {
  return prisma.relatorio.create({
    data: {
      ...chave,
      cargaHorariaTotal: 2,
      itens: {
        create: [
          {
            tipoAtividadeId: ambiente.tipoAtividade.id,
            horas: 2,
            diaSemana: DiaSemana.SEGUNDA,
            horario: "14:00-16:00",
            descricao: "Orientação de TCC",
          },
        ],
      },
    },
  });
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

  const relatorioCC = await criarRelatorioComItem(ambiente, {
    docenteId: ambiente.docente.id,
    cursoId: ambiente.cursoCienciaComp.id,
    periodoLetivoId: ambiente.periodo.id,
  });
  const relatorioSI = await criarRelatorioComItem(ambiente, {
    docenteId: ambiente.docente.id,
    cursoId: ambiente.cursoSistemasInfo.id,
    periodoLetivoId: ambiente.periodo.id,
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

test("coordenador consegue aprovar relatório do qual é autor (autoaprovação permitida)", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await criarRelatorioComItem(ambiente, {
    docenteId: ambiente.coordenadorDocente.id,
    cursoId: ambiente.cursoEngSoftware.id,
    periodoLetivoId: ambiente.periodo.id,
  });

  await submeter(relatorio.id, ambiente.coordenadorDocente.id);
  await aprovar(relatorio.id, ambiente.coordenadorDocente.id);

  const final = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(final.situacao).toBe(SituacaoRelatorio.APROVADO);
});

test("coordenador não enxerga relatório de curso que não é dele", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await criarRelatorioComItem(ambiente, {
    docenteId: ambiente.docente.id,
    cursoId: ambiente.cursoCienciaComp.id,
    periodoLetivoId: ambiente.periodo.id,
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
  const relatorio = await criarRelatorioComItem(ambiente, {
    docenteId: ambiente.docente.id,
    cursoId: ambiente.cursoCienciaComp.id,
    periodoLetivoId: periodoEncerrado.id,
  });

  await expect(submeter(relatorio.id, ambiente.docente.id)).rejects.toThrow(
    "O prazo de entrega deste relatório encerrou",
  );

  const final = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(final.situacao).toBe(SituacaoRelatorio.RASCUNHO);
});

test("devolução sem justificativa é bloqueada", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await criarRelatorioComItem(ambiente, {
    docenteId: ambiente.docente.id,
    cursoId: ambiente.cursoCienciaComp.id,
    periodoLetivoId: ambiente.periodo.id,
  });
  await submeter(relatorio.id, ambiente.docente.id);

  await expect(devolver(relatorio.id, ambiente.coordenador.id, "")).rejects.toThrow();
  await expect(devolver(relatorio.id, ambiente.coordenador.id, "   ")).rejects.toThrow();

  const final = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(final.situacao).toBe(SituacaoRelatorio.AGUARDANDO_AVALIACAO);
});

test("após submeter → devolver → submeter → aprovar, a auditoria tem quatro eventos em ordem cronológica", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await criarRelatorioComItem(ambiente, {
    docenteId: ambiente.docente.id,
    cursoId: ambiente.cursoCienciaComp.id,
    periodoLetivoId: ambiente.periodo.id,
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

  await salvarItens(relatorio.id, [dadosItem(2), dadosItem(3.5)]);

  let atual = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(atual.cargaHorariaTotal.toNumber()).toBe(5.5);

  await salvarItens(relatorio.id, [dadosItem(3.5)]);

  atual = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  const restantes = await prisma.itemAtividade.findMany({ where: { relatorioId: relatorio.id } });
  const somaEsperada = restantes.reduce((soma, item) => soma + item.horas.toNumber(), 0);
  expect(atual.cargaHorariaTotal.toNumber()).toBe(somaEsperada);
});

test("tipo de atividade inativado não entra em item novo, mas o item que já o usava continua", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await criarRelatorioComItem(ambiente, {
    docenteId: ambiente.docente.id,
    cursoId: ambiente.cursoCienciaComp.id,
    periodoLetivoId: ambiente.periodo.id,
  });
  const [tipoAtivo, tipoInativo] = await Promise.all([
    prisma.tipoAtividade.create({ data: { descricao: "Supervisão de Estágio" } }),
    prisma.tipoAtividade.create({ data: { descricao: "Participação em NBE", ativo: false } }),
  ]);
  await prisma.tipoAtividade.update({ where: { id: ambiente.tipoAtividade.id }, data: { ativo: false } });

  const dadosItem = (tipoAtividadeId: number) => ({
    tipoAtividadeId,
    horas: 2,
    diaSemana: DiaSemana.SEGUNDA,
    horario: "14:00-16:00",
    descricao: "Atividade",
  });

  // O item original foi declarado antes da inativação: regravar a lista não o derruba.
  await salvarItens(relatorio.id, [dadosItem(ambiente.tipoAtividade.id), dadosItem(tipoAtivo.id)]);

  await expect(salvarItens(relatorio.id, [dadosItem(tipoInativo.id)])).rejects.toThrow(
    "Tipo de atividade inativo ou inexistente",
  );
  const itens = await prisma.itemAtividade.findMany({ where: { relatorioId: relatorio.id } });
  expect(itens.map((item) => item.tipoAtividadeId).sort()).toEqual(
    [ambiente.tipoAtividade.id, tipoAtivo.id].sort(),
  );
});

test("cargaHorariaTotal bate com a soma dos itens gravados mesmo quando o banco arredonda as horas", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await prisma.relatorio.create({
    data: {
      docenteId: ambiente.docente.id,
      cursoId: ambiente.cursoCienciaComp.id,
      periodoLetivoId: ambiente.periodo.id,
    },
  });

  // Decimal(5,2) arredonda cada item para 0,13; somar o float cru daria 0,25.
  const item = {
    tipoAtividadeId: ambiente.tipoAtividade.id,
    horas: 0.125,
    diaSemana: DiaSemana.SEGUNDA,
    horario: "14:00-16:00",
    descricao: "Orientação de TCC",
  };
  await salvarItens(relatorio.id, [item, item]);

  const atual = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  const gravados = await prisma.itemAtividade.findMany({ where: { relatorioId: relatorio.id } });
  const centesimos = gravados.reduce((soma, gravado) => soma + Math.round(gravado.horas.toNumber() * 100), 0);
  expect(Math.round(atual.cargaHorariaTotal.toNumber() * 100)).toBe(centesimos);
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
  await salvarItens(relatorio.id, [
    {
      tipoAtividadeId: ambiente.tipoAtividade.id,
      horas: 4,
      diaSemana: DiaSemana.TERCA,
      horario: "10:00-12:00",
      descricao: "Orientação de TCC",
    },
  ]);
  await submeter(relatorio.id, ambiente.docente.id);
  await aprovar(relatorio.id, ambiente.coordenador.id);

  await expect(submeter(relatorio.id, ambiente.docente.id)).rejects.toThrow();
  await expect(aprovar(relatorio.id, ambiente.coordenador.id)).rejects.toThrow();
  await expect(devolver(relatorio.id, ambiente.coordenador.id, "tentativa após aprovado")).rejects.toThrow();
  await expect(
    salvarItens(relatorio.id, [
      {
        tipoAtividadeId: ambiente.tipoAtividade.id,
        horas: 1,
        diaSemana: DiaSemana.QUARTA,
        horario: "08:00-09:00",
        descricao: "Nova tentativa",
      },
    ]),
  ).rejects.toThrow();
  await expect(salvarItens(relatorio.id, [])).rejects.toThrow();

  // Nem por fora do workflow: os triggers da migration de imutabilidade fazem
  // o próprio banco recusar (RNF09).
  await expect(
    prisma.relatorio.update({ where: { id: relatorio.id }, data: { cargaHorariaTotal: 99 } }),
  ).rejects.toThrow();
  await expect(prisma.relatorio.delete({ where: { id: relatorio.id } })).rejects.toThrow();
  await expect(
    prisma.itemAtividade.updateMany({ where: { relatorioId: relatorio.id }, data: { horas: 10 } }),
  ).rejects.toThrow();
  await expect(prisma.itemAtividade.deleteMany({ where: { relatorioId: relatorio.id } })).rejects.toThrow();
  await expect(
    prisma.itemAtividade.create({
      data: {
        relatorioId: relatorio.id,
        tipoAtividadeId: ambiente.tipoAtividade.id,
        horas: 1,
        diaSemana: DiaSemana.SEXTA,
        horario: "08:00-09:00",
        descricao: "Inserido direto no banco",
      },
    }),
  ).rejects.toThrow();
  await expect(
    prisma.eventoAuditoria.updateMany({ where: { relatorioId: relatorio.id }, data: { justificativa: "adulterada" } }),
  ).rejects.toThrow();
  await expect(prisma.eventoAuditoria.deleteMany({ where: { relatorioId: relatorio.id } })).rejects.toThrow();

  const final = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(final.situacao).toBe(SituacaoRelatorio.APROVADO);
  expect(final.cargaHorariaTotal.toNumber()).toBe(4);
  const itens = await prisma.itemAtividade.findMany({ where: { relatorioId: relatorio.id } });
  expect(itens.map((item) => item.horas.toNumber())).toEqual([4]);
  const eventos = await prisma.eventoAuditoria.findMany({ where: { relatorioId: relatorio.id } });
  expect(eventos.map((evento) => [evento.tipo, evento.justificativa])).toEqual([
    [TipoEvento.SUBMISSAO, null],
    [TipoEvento.APROVACAO, null],
  ]);
});

test("submissão sem nenhum item é bloqueada", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await prisma.relatorio.create({
    data: {
      docenteId: ambiente.docente.id,
      cursoId: ambiente.cursoCienciaComp.id,
      periodoLetivoId: ambiente.periodo.id,
    },
  });

  await expect(submeter(relatorio.id, ambiente.docente.id)).rejects.toThrow("Adicione ao menos um item");

  const final = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(final.situacao).toBe(SituacaoRelatorio.RASCUNHO);
});

test("coordenador inativado deixa de avaliar: o próximo coordenador ativo do curso assume", async () => {
  const ambiente = await obterAmbiente();
  const substituta = await prisma.usuario.create({
    data: { nome: "Coordenadora Substituta", email: "substituta@srha.dev" },
  });
  await prisma.vinculoCoordenadorCurso.create({
    data: { coordenadorId: substituta.id, cursoId: ambiente.cursoCienciaComp.id },
  });
  await prisma.usuario.update({ where: { id: ambiente.coordenador.id }, data: { ativo: false } });

  const relatorio = await criarRelatorioComItem(ambiente, {
    docenteId: ambiente.docente.id,
    cursoId: ambiente.cursoCienciaComp.id,
    periodoLetivoId: ambiente.periodo.id,
  });
  await submeter(relatorio.id, ambiente.docente.id);

  await expect(aprovar(relatorio.id, ambiente.coordenador.id)).rejects.toThrow();
  await aprovar(relatorio.id, substituta.id);

  const final = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
  expect(final.situacao).toBe(SituacaoRelatorio.APROVADO);
});

test("sem coordenador ativo no curso, a submissão é bloqueada", async () => {
  const ambiente = await obterAmbiente();
  await prisma.usuario.update({ where: { id: ambiente.coordenador.id }, data: { ativo: false } });
  const relatorio = await criarRelatorioComItem(ambiente, {
    docenteId: ambiente.docente.id,
    cursoId: ambiente.cursoCienciaComp.id,
    periodoLetivoId: ambiente.periodo.id,
  });

  await expect(submeter(relatorio.id, ambiente.docente.id)).rejects.toThrow("Nenhum coordenador ativo");
});

describe("prazo de entrega", () => {
  // Relógio simulado: o Prisma gera os @default(now()) em JS, então os
  // eventos gravados (inclusive a devolução) ficam na data simulada.
  function relogio(iso: string) {
    jest.useFakeTimers({ doNotFake: ["nextTick"] }).setSystemTime(new Date(iso));
  }
  afterEach(() => jest.useRealTimers());

  async function criarPeriodo2030() {
    return prisma.periodoLetivo.create({
      data: {
        ano: 2030,
        semestre: 1,
        aberturaSubmissao: new Date("2030-02-01T03:00:00Z"),
        encerramentoSubmissao: new Date("2030-06-30T02:59:59Z"),
      },
    });
  }

  const itemNovo = (tipoAtividadeId: number) => ({
    tipoAtividadeId,
    horas: 3,
    diaSemana: DiaSemana.QUARTA,
    horario: "08:00-11:00",
    descricao: "Supervisão corrigida",
  });

  test("devolvido depois do encerramento pode ser corrigido e reenviado por 7 dias, e não depois", async () => {
    const ambiente = await obterAmbiente();
    const periodo = await criarPeriodo2030();
    const relatorio = await criarRelatorioComItem(ambiente, {
      docenteId: ambiente.docente.id,
      cursoId: ambiente.cursoCienciaComp.id,
      periodoLetivoId: periodo.id,
    });

    relogio("2030-06-01T12:00:00Z");
    await submeter(relatorio.id, ambiente.docente.id);
    relogio("2030-07-10T12:00:00Z"); // avaliação continua depois do encerramento
    await devolver(relatorio.id, ambiente.coordenador.id, "Faltou o horário da supervisão.");

    relogio("2030-07-18T12:00:00Z"); // 8 dias depois da devolução
    await expect(salvarItens(relatorio.id, [itemNovo(ambiente.tipoAtividade.id)])).rejects.toThrow("encerrou");
    await expect(submeter(relatorio.id, ambiente.docente.id)).rejects.toThrow("encerrou");

    relogio("2030-07-16T12:00:00Z"); // 6 dias depois da devolução
    await salvarItens(relatorio.id, [itemNovo(ambiente.tipoAtividade.id)]);
    await submeter(relatorio.id, ambiente.docente.id);

    const final = await prisma.relatorio.findUniqueOrThrow({ where: { id: relatorio.id } });
    expect(final.situacao).toBe(SituacaoRelatorio.AGUARDANDO_AVALIACAO);
    expect(final.cargaHorariaTotal.toNumber()).toBe(3);
  });

  test("rascunho só é criado e editado dentro da janela do período; abrir o existente continua livre", async () => {
    const ambiente = await obterAmbiente();
    const periodo = await criarPeriodo2030();
    await prisma.vinculoDocenteCurso.create({
      data: { docenteId: ambiente.docente.id, cursoId: ambiente.cursoCienciaComp.id, periodoLetivoId: periodo.id },
    });
    const abrir = () => obterOuCriarRascunho(ambiente.docente.id, ambiente.cursoCienciaComp.id, periodo.id);

    relogio("2030-01-15T12:00:00Z"); // antes da abertura
    await expect(abrir()).rejects.toThrow("abre em");

    relogio("2030-03-01T12:00:00Z");
    const relatorioId = await abrir();
    await salvarItens(relatorioId, [itemNovo(ambiente.tipoAtividade.id)]);

    relogio("2030-07-01T12:00:00Z"); // depois do encerramento
    await expect(salvarItens(relatorioId, [])).rejects.toThrow("encerrou");
    await expect(abrir()).resolves.toBe(relatorioId);
  });
});
