import { prisma } from "../../db";
import { listarUsuarios, criarUsuario, atualizarUsuario } from "../usuarios";
import { Perfil } from "../../../app/generated/prisma/client";

async function limpar() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "VinculoCoordenadorCurso", "VinculoDocenteCurso", "UsuarioPerfil", "Usuario" RESTART IDENTITY CASCADE`,
  );
}

beforeEach(async () => {
  await limpar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("cria usuário sem perfil secretaria por padrão", async () => {
  const id = await criarUsuario({ nome: "Helena", email: "helena@srha.dev", ativo: true, secretaria: false });

  const usuarios = await listarUsuarios();

  expect(usuarios).toHaveLength(1);
  expect(usuarios[0]).toMatchObject({ id, nome: "Helena" });
  expect(usuarios[0].perfis).toHaveLength(0);
});

test("marcar secretaria ao criar grava UsuarioPerfil(SECRETARIA)", async () => {
  await criarUsuario({ nome: "Paulo", email: "paulo@srha.dev", ativo: true, secretaria: true });

  const usuarios = await listarUsuarios();

  expect(usuarios[0].perfis.map((p) => p.perfil)).toEqual([Perfil.SECRETARIA]);
});

test("desmarcar secretaria ao atualizar remove o UsuarioPerfil", async () => {
  const id = await criarUsuario({ nome: "Paulo", email: "paulo@srha.dev", ativo: true, secretaria: true });

  await atualizarUsuario(id, { nome: "Paulo", email: "paulo@srha.dev", ativo: true, secretaria: false });

  const usuarios = await listarUsuarios();
  expect(usuarios[0].perfis).toHaveLength(0);
});

test("marcar secretaria duas vezes não duplica o perfil", async () => {
  const id = await criarUsuario({ nome: "Paulo", email: "paulo@srha.dev", ativo: true, secretaria: false });

  await atualizarUsuario(id, { nome: "Paulo", email: "paulo@srha.dev", ativo: true, secretaria: true });
  await atualizarUsuario(id, { nome: "Paulo", email: "paulo@srha.dev", ativo: true, secretaria: true });

  const usuarios = await listarUsuarios();
  expect(usuarios[0].perfis).toHaveLength(1);
});

test("email duplicado é rejeitado", async () => {
  await criarUsuario({ nome: "Helena", email: "helena@srha.dev", ativo: true, secretaria: false });

  await expect(
    criarUsuario({ nome: "Outra Helena", email: "helena@srha.dev", ativo: true, secretaria: false }),
  ).rejects.toThrow("Já existe um usuário com este e-mail.");
});

test("inativar usuário preserva o registro em vez de excluir", async () => {
  const id = await criarUsuario({ nome: "Helena", email: "helena@srha.dev", ativo: true, secretaria: false });

  await atualizarUsuario(id, { nome: "Helena", email: "helena@srha.dev", ativo: false, secretaria: false });

  const usuarios = await listarUsuarios();
  expect(usuarios).toHaveLength(1);
  expect(usuarios[0].ativo).toBe(false);
});
