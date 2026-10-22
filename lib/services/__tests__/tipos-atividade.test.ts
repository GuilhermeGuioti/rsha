import { prisma } from "../../db";
import { listarTiposAtividade, criarTipoAtividade, atualizarTipoAtividade } from "../tipos-atividade";

async function limpar() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ItemAtividade", "TipoAtividade" RESTART IDENTITY CASCADE`);
}

beforeEach(async () => {
  await limpar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("cria tipo de atividade e aparece na listagem", async () => {
  const id = await criarTipoAtividade({ descricao: "Orientação de TCC", ativo: true });

  const tipos = await listarTiposAtividade();

  expect(tipos).toHaveLength(1);
  expect(tipos[0]).toMatchObject({ id, descricao: "Orientação de TCC", ativo: true });
  expect(tipos[0]._count.itens).toBe(0);
});

test("descrição de tipo de atividade duplicada é rejeitada", async () => {
  await criarTipoAtividade({ descricao: "Orientação de TCC", ativo: true });

  await expect(criarTipoAtividade({ descricao: "Orientação de TCC", ativo: true })).rejects.toThrow(
    "Já existe um tipo de atividade com esta descrição.",
  );
});

test("atualizar tipo de atividade mantendo a mesma descrição não é rejeitado como duplicado", async () => {
  const id = await criarTipoAtividade({ descricao: "Orientação de TCC", ativo: true });

  await atualizarTipoAtividade(id, { descricao: "Orientação de TCC", ativo: false });

  const tipos = await listarTiposAtividade();
  expect(tipos[0].ativo).toBe(false);
});

test("renomear para a descrição de outro tipo é rejeitado", async () => {
  await criarTipoAtividade({ descricao: "Orientação de TCC", ativo: true });
  const id = await criarTipoAtividade({ descricao: "Supervisão de Estágio", ativo: true });

  await expect(atualizarTipoAtividade(id, { descricao: "Orientação de TCC", ativo: true })).rejects.toThrow(
    "Já existe um tipo de atividade com esta descrição.",
  );
});

test("inativar tipo de atividade preserva o registro em vez de excluir", async () => {
  const id = await criarTipoAtividade({ descricao: "Orientação de TCC", ativo: true });

  await atualizarTipoAtividade(id, { descricao: "Orientação de TCC", ativo: false });

  const tipos = await listarTiposAtividade();
  expect(tipos).toHaveLength(1);
  expect(tipos[0].ativo).toBe(false);
});
