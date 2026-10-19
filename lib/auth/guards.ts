import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./config";
import { prisma } from "../db";
import { Perfil, SituacaoRelatorio } from "../../generated/prisma/client";
import { resolverAvaliadorId } from "../services/workflow";

export type Sessao = { usuarioId: number };

// O token só guarda o usuarioId e vale até o próximo login, então "ativo" é
// conferido por requisição: usuário inativado pela secretaria perde o acesso
// na hora, não quando a sessão expirar.
const usuarioAtivo = cache(async (usuarioId: number): Promise<boolean> => {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { ativo: true } });
  return usuario?.ativo ?? false;
});

export async function exigirSessao(): Promise<Sessao> {
  const sessao = await auth();
  if (!sessao?.usuarioId) {
    throw new Error("Sessão não encontrada. Faça login novamente.");
  }
  if (!(await usuarioAtivo(sessao.usuarioId))) {
    throw new Error("Usuário inativo. Procure a secretaria acadêmica.");
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
  if (!(await usuarioAtivo(sessao.usuarioId))) {
    redirect("/login?erro=1");
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
  // O id chega do cliente (argumento de Server Action ou segmento de URL) e
  // é lido aqui antes do zod da action — o que não é id não vai ao banco.
  const relatorio =
    Number.isInteger(relatorioId) && relatorioId > 0
      ? await prisma.relatorio.findUnique({ where: { id: relatorioId } })
      : null;
  if (!relatorio) {
    throw new Error("Relatório não encontrado.");
  }

  const ehAutor = relatorio.docenteId === sessao.usuarioId;
  if (ehAutor && acao !== "avaliar") {
    return sessao;
  }
  if (acao === "editar") {
    throw new Error("Apenas o autor pode editar este relatório.");
  }

  // Rascunho é visível só ao autor e à secretaria (RF07 e quadro 10 do
  // documento de requisitos): a coordenação enxerga a partir da submissão.
  const rascunhoAlheio = !ehAutor && relatorio.situacao === SituacaoRelatorio.RASCUNHO;

  if (acao === "avaliar") {
    const avaliadorId = await resolverAvaliadorId(prisma, relatorio.cursoId);
    if (avaliadorId !== sessao.usuarioId) {
      throw new Error("Apenas o avaliador responsável pode avaliar este relatório.");
    }
    if (rascunhoAlheio) {
      throw new Error("Este relatório ainda é um rascunho e só fica visível depois de enviado.");
    }
    return sessao;
  }

  const perfis = await obterPerfis(sessao.usuarioId);
  if (perfis.includes(Perfil.SECRETARIA)) {
    return sessao;
  }
  // Coordenação lê os relatórios dos cursos que coordena (quadro 3 do
  // documento de requisitos) — qualquer coordenador do curso, não só o que
  // avalia, já que o painel e o arquivo mostram o curso inteiro a todos eles.
  const coordenaOCurso = await prisma.vinculoCoordenadorCurso.findUnique({
    where: { coordenadorId_cursoId: { coordenadorId: sessao.usuarioId, cursoId: relatorio.cursoId } },
  });
  if (!coordenaOCurso) {
    throw new Error("Sem permissão para visualizar este relatório.");
  }
  if (rascunhoAlheio) {
    throw new Error("Este relatório ainda é um rascunho e só fica visível depois de enviado.");
  }
  return sessao;
}
