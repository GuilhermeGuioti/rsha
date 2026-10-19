import { prisma } from "../db";
import { Perfil } from "../../generated/prisma/client";
import { sincronizarPerfil } from "./perfis";

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

export async function criarUsuario(dados: DadosUsuario): Promise<number> {
  await exigirEmailDisponivel(dados.email);
  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: { nome: dados.nome, email: dados.email, ativo: dados.ativo },
    });
    await sincronizarPerfil(tx, usuario.id, Perfil.SECRETARIA, dados.secretaria);
    return usuario.id;
  });
}

const SECRETARIA_ATIVA = { ativo: true, perfis: { some: { perfil: Perfil.SECRETARIA } } };

export async function atualizarUsuario(id: number, dados: DadosUsuario): Promise<void> {
  await exigirEmailDisponivel(dados.email, id);
  await prisma.$transaction(async (tx) => {
    const eraSecretariaAtiva = await tx.usuario.count({ where: { id, ...SECRETARIA_ATIVA } });
    await tx.usuario.update({
      where: { id },
      data: { nome: dados.nome, email: dados.email, ativo: dados.ativo },
    });
    await sincronizarPerfil(tx, id, Perfil.SECRETARIA, dados.secretaria);
    // Sem ninguém ativo na secretaria, ninguém mais cadastra, vincula ou
    // reativa — o sistema trancaria por dentro. Se esta alteração tirou uma
    // secretaria ativa, confere quantas restaram e desfaz tudo se zerou.
    const deixouDeSer = eraSecretariaAtiva > 0 && !(dados.ativo && dados.secretaria);
    if (deixouDeSer && (await tx.usuario.count({ where: SECRETARIA_ATIVA })) === 0) {
      throw new Error(
        "O sistema precisa de ao menos uma pessoa ativa na secretaria acadêmica — cadastre outra antes de inativar esta ou tirar o perfil dela.",
      );
    }
  });
}
