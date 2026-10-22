import Papa from "papaparse";
import { prisma } from "../../db";
import { COLUNAS_EXTRACAO, extrairPeriodo } from "../extracao";
import { submeter, aprovar, devolver } from "../workflow";
import { salvarItens, type DadosItem } from "../itens";
import { DiaSemana, Perfil } from "../../../generated/prisma/client";

async function limpar() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "EventoAuditoria", "ItemAtividade", "Relatorio", "VinculoCoordenadorCurso", "VinculoDocenteCurso", "TipoAtividade", "PeriodoLetivo", "Curso", "UsuarioPerfil", "Usuario" RESTART IDENTITY CASCADE`,
  );
}

async function obterAmbiente() {
  const [ana, bruno, carla, coordenador] = await Promise.all([
    prisma.usuario.create({ data: { nome: "Ana Gonçalves", email: "ana@srha.dev" } }),
    prisma.usuario.create({ data: { nome: "Bruno Lima", email: "bruno@srha.dev" } }),
    prisma.usuario.create({ data: { nome: "Carla Souza", email: "carla@srha.dev" } }),
    prisma.usuario.create({ data: { nome: "Carlos Coordenador", email: "carlos@srha.dev" } }),
  ]);
  await prisma.usuarioPerfil.createMany({
    data: [
      { usuarioId: ana.id, perfil: Perfil.DOCENTE },
      { usuarioId: bruno.id, perfil: Perfil.DOCENTE },
      { usuarioId: carla.id, perfil: Perfil.DOCENTE },
      { usuarioId: coordenador.id, perfil: Perfil.COORDENADOR },
    ],
  });

  const [computacao, software] = await Promise.all([
    prisma.curso.create({ data: { nome: "Ciência da Computação" } }),
    prisma.curso.create({ data: { nome: "Engenharia de Software" } }),
  ]);
  const [periodo, periodoAnterior] = await Promise.all([
    prisma.periodoLetivo.create({
      data: {
        ano: 2026,
        semestre: 2,
        aberturaSubmissao: new Date("2026-08-01T00:00:00Z"),
        encerramentoSubmissao: new Date("2026-12-15T23:59:59Z"),
      },
    }),
    prisma.periodoLetivo.create({
      data: {
        ano: 2026,
        semestre: 1,
        aberturaSubmissao: new Date("2026-02-01T00:00:00Z"),
        encerramentoSubmissao: new Date("2026-06-30T23:59:59Z"),
      },
    }),
  ]);
  const tipo = await prisma.tipoAtividade.create({ data: { descricao: "Orientação de TCC" } });

  await prisma.vinculoCoordenadorCurso.createMany({
    data: [
      { coordenadorId: coordenador.id, cursoId: computacao.id },
      { coordenadorId: coordenador.id, cursoId: software.id },
    ],
  });

  const criarRelatorio = (docenteId: number, cursoId: number, periodoLetivoId = periodo.id) =>
    prisma.relatorio.create({ data: { docenteId, cursoId, periodoLetivoId } });
  const item = (horas: number, descricao = "Orientação de trabalhos de conclusão."): DadosItem => ({
    tipoAtividadeId: tipo.id,
    horas,
    diaSemana: DiaSemana.TERCA,
    horario: "14:00-18:00",
    descricao,
  });

  return { ana, bruno, carla, coordenador, computacao, software, periodo, periodoAnterior, criarRelatorio, item };
}

function lerCsv(csv: string) {
  return Papa.parse<Record<string, string>>(csv.replace(/^﻿/, ""), {
    delimiter: ";",
    header: true,
    skipEmptyLines: true,
  });
}

beforeEach(limpar);
afterAll(() => prisma.$disconnect());

// Congela o relógio dentro do prazo do período do cenário — submeter fora do
// prazo é bloqueado pelo workflow.
beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick"] }).setSystemTime(new Date("2026-10-01T12:00:00Z"));
});
afterAll(() => jest.useRealTimers());

test("extração tem uma linha por item, com os dados do relatório e da tramitação", async () => {
  const ambiente = await obterAmbiente();

  // Ana: dois itens, passou por devolução e foi aprovada.
  const aprovado = await ambiente.criarRelatorio(ambiente.ana.id, ambiente.computacao.id);
  await salvarItens(aprovado.id, [ambiente.item(4), ambiente.item(1.5)]);
  await submeter(aprovado.id, ambiente.ana.id);
  await devolver(aprovado.id, ambiente.coordenador.id, "Detalhar os horários.");
  await submeter(aprovado.id, ambiente.ana.id);
  await aprovar(aprovado.id, ambiente.coordenador.id);

  // Bruno: um item, ainda em rascunho.
  const rascunho = await ambiente.criarRelatorio(ambiente.bruno.id, ambiente.software.id);
  await salvarItens(rascunho.id, [ambiente.item(2)]);

  // Carla: relatório sem item — não gera linha.
  await ambiente.criarRelatorio(ambiente.carla.id, ambiente.computacao.id);

  // Relatório de outro período não entra na extração deste.
  const outroPeriodo = await ambiente.criarRelatorio(
    ambiente.ana.id,
    ambiente.computacao.id,
    ambiente.periodoAnterior.id,
  );
  await prisma.itemAtividade.create({
    data: { relatorioId: outroPeriodo.id, ...ambiente.item(8) },
  });

  const extracao = await extrairPeriodo(ambiente.periodo.id);

  expect(extracao).toMatchObject({ ano: 2026, semestre: 2 });
  expect(extracao.csv.charCodeAt(0)).toBe(0xfeff);
  const { data: linhas, meta } = lerCsv(extracao.csv);
  expect(meta.fields).toEqual([...COLUNAS_EXTRACAO]);
  expect(linhas).toHaveLength(3);

  // Ordem: curso, depois docente.
  expect(linhas.map((linha) => [linha["Curso"], linha["Docente"], linha["Horas"]])).toEqual([
    ["Ciência da Computação", "Ana Gonçalves", "4,0"],
    ["Ciência da Computação", "Ana Gonçalves", "1,5"],
    ["Engenharia de Software", "Bruno Lima", "2,0"],
  ]);

  const dataHora = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
  expect(linhas[0]).toMatchObject({
    Ano: "2026",
    Semestre: "2",
    Relatório: "REL-2026-2-001",
    "E-mail do docente": "ana@srha.dev",
    Situação: "Aprovado",
    "Tipo de atividade": "Orientação de TCC",
    "Dia da semana": "Terça",
    Horário: "14:00-18:00",
    "Carga horária total": "5,5",
  });
  for (const coluna of ["Criado em", "Último envio em", "Última devolução em", "Aprovado em"]) {
    expect(linhas[0][coluna]).toMatch(dataHora);
  }

  expect(linhas[2]).toMatchObject({
    Situação: "Rascunho",
    "Último envio em": "",
    "Última devolução em": "",
    "Aprovado em": "",
  });
  expect(linhas[2]["Criado em"]).toMatch(dataHora);
});

test("descrição que começa como fórmula não vira fórmula na planilha", async () => {
  const ambiente = await obterAmbiente();
  const relatorio = await ambiente.criarRelatorio(ambiente.ana.id, ambiente.computacao.id);
  await salvarItens(relatorio.id, [ambiente.item(2, '=HYPERLINK("http://exemplo.invalid")')]);

  const { data: linhas } = lerCsv((await extrairPeriodo(ambiente.periodo.id)).csv);

  expect(linhas[0]["Descrição"]).toBe(`'=HYPERLINK("http://exemplo.invalid")`);
});

test("período sem nenhum item gera só o cabeçalho", async () => {
  const ambiente = await obterAmbiente();

  const { data: linhas, meta } = lerCsv((await extrairPeriodo(ambiente.periodo.id)).csv);

  expect(meta.fields).toEqual([...COLUNAS_EXTRACAO]);
  expect(linhas).toHaveLength(0);
});

test("período inexistente não é extraído", async () => {
  await expect(extrairPeriodo(999)).rejects.toThrow("Período letivo não encontrado.");
});
