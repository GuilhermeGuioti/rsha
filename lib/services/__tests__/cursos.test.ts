import { prisma } from "../../db";
import { listarCursos, criarCurso, atualizarCurso } from "../cursos";

async function limpar() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "VinculoCoordenadorCurso", "VinculoDocenteCurso", "Curso", "UsuarioPerfil", "Usuario" RESTART IDENTITY CASCADE`,
  );
}

beforeEach(async () => {
  await limpar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("cria curso e aparece na listagem", async () => {
  const id = await criarCurso({ nome: "Fisioterapia", ativo: true, avaliadorAlternativoId: null });

  const cursos = await listarCursos();

  expect(cursos).toHaveLength(1);
  expect(cursos[0]).toMatchObject({ id, nome: "Fisioterapia", ativo: true });
});

test("nome de curso duplicado é rejeitado", async () => {
  await criarCurso({ nome: "Fisioterapia", ativo: true, avaliadorAlternativoId: null });

  await expect(
    criarCurso({ nome: "Fisioterapia", ativo: true, avaliadorAlternativoId: null }),
  ).rejects.toThrow("Já existe um curso com este nome.");
});

test("atualizar curso mantendo o mesmo nome não é rejeitado como duplicado", async () => {
  const id = await criarCurso({ nome: "Fisioterapia", ativo: true, avaliadorAlternativoId: null });

  await atualizarCurso(id, { nome: "Fisioterapia", ativo: false, avaliadorAlternativoId: null });

  const cursos = await listarCursos();
  expect(cursos[0].ativo).toBe(false);
});

test("inativar curso preserva o registro em vez de excluir", async () => {
  const id = await criarCurso({ nome: "Fisioterapia", ativo: true, avaliadorAlternativoId: null });

  await atualizarCurso(id, { nome: "Fisioterapia", ativo: false, avaliadorAlternativoId: null });

  const cursos = await listarCursos();
  expect(cursos).toHaveLength(1);
  expect(cursos[0].ativo).toBe(false);
});
