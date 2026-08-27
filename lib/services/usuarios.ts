import { prisma } from "../db";
import { Perfil, Prisma } from "../../app/generated/prisma/client";

export type DadosUsuario = {
  nome: string;
  email: string;
  ativo: boolean;
  secretaria: boolean;
};

export async function listarUsuarios() {
  return prisma.usuario.findMany({
    orderBy: { nome: "asc" },
    include: {
      perfis: true,
      vinculosDocente: { include: { curso: true } },
      vinculosCoordenador: { include: { curso: true } },
    },
  });
}

async function exigirEmailDisponivel(email: string, ignorarId?: number): Promise<void> {
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente && existente.id !== ignorarId) {
    throw new Error("Já existe um usuário com este e-mail.");
  }
}

async function sincronizarPerfilSecretaria(
  cliente: Prisma.TransactionClient,
  usuarioId: number,
  secretaria: boolean,
): Promise<void> {
  const perfilSecretaria = await cliente.usuarioPerfil.findUnique({
    where: { usuarioId_perfil: { usuarioId, perfil: Perfil.SECRETARIA } },
  });
  if (secretaria && !perfilSecretaria) {
    await cliente.usuarioPerfil.create({ data: { usuarioId, perfil: Perfil.SECRETARIA } });
  } else if (!secretaria && perfilSecretaria) {
    await cliente.usuarioPerfil.delete({ where: { id: perfilSecretaria.id } });
  }
}

export async function criarUsuario(dados: DadosUsuario): Promise<number> {
  await exigirEmailDisponivel(dados.email);
  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: { nome: dados.nome, email: dados.email, ativo: dados.ativo },
    });
    await sincronizarPerfilSecretaria(tx, usuario.id, dados.secretaria);
    return usuario.id;
  });
}

export async function atualizarUsuario(id: number, dados: DadosUsuario): Promise<void> {
  await exigirEmailDisponivel(dados.email, id);
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id },
      data: { nome: dados.nome, email: dados.email, ativo: dados.ativo },
    });
    await sincronizarPerfilSecretaria(tx, id, dados.secretaria);
  });
}
