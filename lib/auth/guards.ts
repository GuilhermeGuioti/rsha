import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./config";
import { prisma } from "../db";
import { Perfil } from "../../generated/prisma/client";
import { resolverAvaliadorId } from "../services/workflow";

export type Sessao = { usuarioId: number };

export async function exigirSessao(): Promise<Sessao> {
  const sessao = await auth();
  if (!sessao?.usuarioId) {
    throw new Error("Sessão não encontrada. Faça login novamente.");
  }
  return { usuarioId: sessao.usuarioId };
}

// Para pages (não Server Actions): sem sessão, manda pro /login em vez de
// estourar erro na renderização.
export async function exigirSessaoPagina(): Promise<Sessao> {
  const sessao = await auth();
  if (!sessao?.usuarioId) {
    redirect("/login");
  }
  return { usuarioId: sessao.usuarioId };
}

// Perfis e vínculos são carregados por requisição; cache() evita repetir a
// query no mesmo render (a sessão só guarda usuarioId — ver CLAUDE.md).
export const obterPerfis = cache(async (usuarioId: number): Promise<Perfil[]> => {
  const registros = await prisma.usuarioPerfil.findMany({ where: { usuarioId } });
  return registros.map((registro) => registro.perfil);
});

export async function exigirPerfil(perfil: Perfil): Promise<Sessao> {
  const sessao = await exigirSessao();
  const perfis = await obterPerfis(sessao.usuarioId);
  if (!perfis.includes(perfil)) {
    throw new Error(`Acesso restrito ao perfil ${perfil}.`);
  }
  return sessao;
}

export type AcaoRelatorio = "editar" | "avaliar" | "visualizar";

export async function exigirAcessoAoRelatorio(
  relatorioId: number,
  acao: AcaoRelatorio,
): Promise<Sessao> {
  const sessao = await exigirSessao();
  const relatorio = await prisma.relatorio.findUnique({ where: { id: relatorioId } });
  if (!relatorio) {
    throw new Error("Relatório não encontrado.");
  }

  const ehAutor = relatorio.docenteId === sessao.usuarioId;
  const avaliadorId = await resolverAvaliadorId(prisma, relatorio.cursoId, relatorio.docenteId);
  const ehAvaliador = avaliadorId === sessao.usuarioId;

  if (acao === "editar" && !ehAutor) {
    throw new Error("Apenas o autor pode editar este relatório.");
  }
  if (acao === "avaliar" && !ehAvaliador) {
    throw new Error("Apenas o avaliador responsável pode avaliar este relatório.");
  }
  if (acao === "visualizar" && !ehAutor && !ehAvaliador) {
    const perfis = await obterPerfis(sessao.usuarioId);
    if (!perfis.includes(Perfil.SECRETARIA)) {
      throw new Error("Sem permissão para visualizar este relatório.");
    }
  }

  return sessao;
}
