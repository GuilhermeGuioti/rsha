import { randomBytes } from "node:crypto";
import { prisma } from "../../db";
import {
  MARCADOR_PDF,
  conferirCodigoAutenticidade,
  extrairCodigoDoPdf,
  gerarCodigoAutenticidade,
} from "../autenticidade";
import { submeter, aprovar } from "../workflow";
import { salvarItens } from "../itens";
import { DiaSemana, Perfil, TipoEvento } from "../../../generated/prisma/client";

const CHAVE_1 = `1:${randomBytes(32).toString("base64")}`;
const CHAVE_2 = `2:${randomBytes(32).toString("base64")}`;

async function limpar() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "EventoAuditoria", "ItemAtividade", "Relatorio", "VinculoCoordenadorCurso", "VinculoDocenteCurso", "TipoAtividade", "PeriodoLetivo", "Curso", "UsuarioPerfil", "Usuario" RESTART IDENTITY CASCADE`,
  );
}

// Relatório com um item, submetido; `aprovado` decide se a coordenação aprova.
async function criarRelatorio({ aprovado }: { aprovado: boolean }) {
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
  const tipo = await prisma.tipoAtividade.create({ data: { descricao: "Orientação de TCC" } });
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
      tipoAtividadeId: tipo.id,
      horas: 4.5,
      diaSemana: DiaSemana.TERCA,
      horario: "14:00–18:30",
      descricao: "Orientação de dois trabalhos de conclusão.",
    },
  ]);
  await submeter(relatorio.id, docente.id);
  if (aprovado) {
    await aprovar(relatorio.id, coordenador.id);
  }
  return relatorio.id;
}

async function aprovadoEm(relatorioId: number): Promise<Date> {
  const evento = await prisma.eventoAuditoria.findFirstOrThrow({
    where: { relatorioId, tipo: TipoEvento.APROVACAO },
  });
  return evento.ocorridoEm;
}

beforeEach(async () => {
  process.env.CHAVES_CARIMBO = CHAVE_1;
  await limpar();
});
afterAll(() => prisma.$disconnect());

// Congela o relógio dentro do prazo do período do cenário — submeter fora do
// prazo é bloqueado pelo workflow.
beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick"] }).setSystemTime(new Date("2026-10-01T12:00:00Z"));
});
afterAll(() => jest.useRealTimers());

test("código do relatório aprovado é conferido e devolve o resumo oficial", async () => {
  const relatorioId = await criarRelatorio({ aprovado: true });
  const codigo = gerarCodigoAutenticidade(relatorioId, await aprovadoEm(relatorioId));

  expect(codigo).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/);
  expect(await conferirCodigoAutenticidade(codigo)).toEqual({
    id: relatorioId,
    ano: 2026,
    semestre: 2,
    curso: "Ciência da Computação",
    docente: "Ana Gonçalves",
    cargaHorariaTotal: 4.5,
    aprovadoPor: "Carlos Coordenador",
    aprovadoEm: await aprovadoEm(relatorioId),
  });
});

test("toda via do mesmo relatório sai com o mesmo código", async () => {
  const relatorioId = await criarRelatorio({ aprovado: true });
  const instante = await aprovadoEm(relatorioId);

  expect(gerarCodigoAutenticidade(relatorioId, instante)).toBe(gerarCodigoAutenticidade(relatorioId, instante));
});

test("código digitado em minúsculas, sem hífen e com O e I no lugar de 0 e 1 continua valendo", async () => {
  const relatorioId = await criarRelatorio({ aprovado: true });
  const codigo = gerarCodigoAutenticidade(relatorioId, await aprovadoEm(relatorioId));
  const digitado = codigo.replace(/-/g, " ").replace(/0/g, "o").replace(/1/g, "I").toLowerCase();

  expect(await conferirCodigoAutenticidade(digitado)).not.toBeNull();
});

test("um caractere trocado invalida o código", async () => {
  const relatorioId = await criarRelatorio({ aprovado: true });
  const codigo = gerarCodigoAutenticidade(relatorioId, await aprovadoEm(relatorioId));
  // Meio da assinatura: o último caractere é quase todo enchimento.
  const posicao = 16;
  const trocado = codigo.slice(0, posicao) + (codigo[posicao] === "A" ? "B" : "A") + codigo.slice(posicao + 1);

  expect(await conferirCodigoAutenticidade(trocado)).toBeNull();
});

test("código de relatório que não está aprovado não confere", async () => {
  const relatorioId = await criarRelatorio({ aprovado: false });
  const codigo = gerarCodigoAutenticidade(relatorioId, new Date());

  expect(await conferirCodigoAutenticidade(codigo)).toBeNull();
});

test("código de outra aprovação com o mesmo id não confere", async () => {
  const relatorioId = await criarRelatorio({ aprovado: true });
  const outroInstante = new Date((await aprovadoEm(relatorioId)).getTime() - 1);

  expect(await conferirCodigoAutenticidade(gerarCodigoAutenticidade(relatorioId, outroInstante))).toBeNull();
});

test("código gerado com chave desconhecida não confere", async () => {
  const relatorioId = await criarRelatorio({ aprovado: true });
  const instante = await aprovadoEm(relatorioId);
  process.env.CHAVES_CARIMBO = `1:${randomBytes(32).toString("base64")}`;
  const forjado = gerarCodigoAutenticidade(relatorioId, instante);
  process.env.CHAVES_CARIMBO = CHAVE_1;

  expect(await conferirCodigoAutenticidade(forjado)).toBeNull();
});

test("trocar a chave não invalida o que já foi impresso com a anterior", async () => {
  const relatorioId = await criarRelatorio({ aprovado: true });
  const instante = await aprovadoEm(relatorioId);
  const impressoAntes = gerarCodigoAutenticidade(relatorioId, instante);

  process.env.CHAVES_CARIMBO = `${CHAVE_1},${CHAVE_2}`;
  const impressoDepois = gerarCodigoAutenticidade(relatorioId, instante);

  expect(impressoDepois).not.toBe(impressoAntes);
  expect(await conferirCodigoAutenticidade(impressoAntes)).not.toBeNull();
  expect(await conferirCodigoAutenticidade(impressoDepois)).not.toBeNull();

  // Versão retirada da lista: o que foi impresso com ela deixa de valer.
  process.env.CHAVES_CARIMBO = CHAVE_2;
  expect(await conferirCodigoAutenticidade(impressoAntes)).toBeNull();
});

test("sem chave configurada o código não é emitido", () => {
  delete process.env.CHAVES_CARIMBO;

  expect(() => gerarCodigoAutenticidade(1, new Date())).toThrow("CHAVES_CARIMBO não configurada");
});

// O react-pdf é só ESM e o Jest do projeto não o transpila: em vez de gerar o
// PDF aqui, o trecho reproduz como ele grava o campo Keywords — objeto
// indireto com string literal, sem compressão.
test("o código é lido dos metadados do PDF emitido e confere", async () => {
  const relatorioId = await criarRelatorio({ aprovado: true });
  const codigo = gerarCodigoAutenticidade(relatorioId, await aprovadoEm(relatorioId));
  const pdf = new TextEncoder().encode(
    `%PDF-1.3\n%\xff\xff\xff\xff\n16 0 obj\n(${MARCADOR_PDF}${codigo})\nendobj\n11 0 obj\n<<\n/Keywords 16 0 R\n>>\nendobj\n%%EOF`,
  );

  expect(extrairCodigoDoPdf(pdf)).toBe(codigo);
  expect(await conferirCodigoAutenticidade(codigo)).not.toBeNull();
});

test("arquivo que não é PDF do SRHA não tem código", () => {
  expect(extrairCodigoDoPdf(new TextEncoder().encode("SRHA-AUTENTICIDADE:AAAA-AAAA-AAAA-AAAA-AAAA"))).toBeNull();
  expect(extrairCodigoDoPdf(new TextEncoder().encode("%PDF-1.7\n%%EOF"))).toBeNull();
});
