import { prisma } from "../../db";
import { listarPeriodos, criarPeriodo, atualizarPeriodo } from "../periodos";

async function limpar() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "PeriodoLetivo" RESTART IDENTITY CASCADE`);
}

const dados = (extra?: Partial<Parameters<typeof criarPeriodo>[0]>) => ({
  ano: 2026,
  semestre: 2,
  aberturaSubmissao: new Date("2026-08-01T00:00:00Z"),
  encerramentoSubmissao: new Date("2026-12-15T23:59:59Z"),
  ...extra,
});

beforeEach(async () => {
  await limpar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("cria período e aparece na listagem", async () => {
  const id = await criarPeriodo(dados());

  const periodos = await listarPeriodos();

  expect(periodos).toHaveLength(1);
  expect(periodos[0]).toMatchObject({ id, ano: 2026, semestre: 2 });
});

test("ano e semestre repetidos são rejeitados", async () => {
  await criarPeriodo(dados());

  await expect(criarPeriodo(dados())).rejects.toThrow(
    "Já existe um período letivo cadastrado para este ano e semestre.",
  );
});

test("atualizar período mantendo ano e semestre não é rejeitado como duplicado", async () => {
  const id = await criarPeriodo(dados());

  await atualizarPeriodo(id, dados({ encerramentoSubmissao: new Date("2026-12-20T23:59:59Z") }));

  const periodos = await listarPeriodos();
  expect(periodos[0].encerramentoSubmissao.toISOString()).toBe("2026-12-20T23:59:59.000Z");
});

test("encerramento antes ou igual à abertura é rejeitado", async () => {
  await expect(
    criarPeriodo(
      dados({
        aberturaSubmissao: new Date("2026-08-01T00:00:00Z"),
        encerramentoSubmissao: new Date("2026-08-01T00:00:00Z"),
      }),
    ),
  ).rejects.toThrow("O encerramento da submissão deve ser depois da abertura.");
});
