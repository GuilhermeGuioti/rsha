import { prisma } from "../db";
import { Prisma, SituacaoRelatorio, TipoEvento } from "../../generated/prisma/client";

/**
 * Roteamento automático: o avaliador é o coordenador vinculado ao curso —
 * mesmo quando o autor do relatório é esse coordenador. Autoaprovação é
 * permitida de propósito. Sem coordenador vinculado, não há avaliador.
 */
export async function resolverAvaliadorId(
  cliente: Prisma.TransactionClient,
  cursoId: number,
): Promise<number | null> {
  const vinculo = await cliente.vinculoCoordenadorCurso.findFirst({
    where: { cursoId },
    orderBy: { id: "asc" },
  });
  return vinculo?.coordenadorId ?? null;
}

/**
 * A linha de Relatorio nasce sob demanda: só existe a partir da primeira
 * escrita do próprio docente (abrir o curso e salvar rascunho, ou adicionar
 * o primeiro item). Nunca é criada em lote no cadastro do período.
 */
export async function obterOuCriarRascunho(
  docenteId: number,
  cursoId: number,
  periodoLetivoId: number,
): Promise<number> {
  const vinculo = await prisma.vinculoDocenteCurso.findUnique({
    where: { docenteId_cursoId_periodoLetivoId: { docenteId, cursoId, periodoLetivoId } },
  });
  if (!vinculo) {
    throw new Error("Docente não está vinculado a este curso neste período.");
  }

  // ponytail: sem retry — dois cliques simultâneos do mesmo docente fazem o
  // segundo esbarrar no @@unique. Se virar reclamação, tratar P2002 e reler.
  return prisma.$transaction(async (tx) => {
    const existente = await tx.relatorio.findUnique({
      where: { docenteId_cursoId_periodoLetivoId: { docenteId, cursoId, periodoLetivoId } },
    });
    if (existente) {
      return existente.id;
    }
    const criado = await tx.relatorio.create({ data: { docenteId, cursoId, periodoLetivoId } });
    await tx.eventoAuditoria.create({
      data: { relatorioId: criado.id, tipo: TipoEvento.CRIACAO, usuarioId: docenteId },
    });
    return criado.id;
  });
}

export async function submeter(relatorioId: number, usuarioId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const relatorio = await tx.relatorio.findUnique({
      where: { id: relatorioId },
      include: { periodo: true },
    });
    if (!relatorio) {
      throw new Error("Relatório não encontrado.");
    }
    if (relatorio.docenteId !== usuarioId) {
      throw new Error("Apenas o autor do relatório pode submetê-lo.");
    }
    if (
      relatorio.situacao !== SituacaoRelatorio.RASCUNHO &&
      relatorio.situacao !== SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE
    ) {
      throw new Error(`Não é possível submeter um relatório em situação ${relatorio.situacao}.`);
    }
    const agora = new Date();
    if (agora < relatorio.periodo.aberturaSubmissao || agora > relatorio.periodo.encerramentoSubmissao) {
      throw new Error("Fora do prazo de submissão deste período letivo.");
    }

    const avaliadorId = await resolverAvaliadorId(tx, relatorio.cursoId);
    if (avaliadorId === null) {
      throw new Error(
        "Nenhum coordenador vinculado a este curso — a secretaria precisa cadastrar um antes da submissão.",
      );
    }

    await tx.relatorio.update({
      where: { id: relatorioId },
      data: { situacao: SituacaoRelatorio.AGUARDANDO_AVALIACAO },
    });
    await tx.eventoAuditoria.create({
      data: { relatorioId, tipo: TipoEvento.SUBMISSAO, usuarioId },
    });
  });
}

export async function aprovar(relatorioId: number, usuarioId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const relatorio = await tx.relatorio.findUnique({ where: { id: relatorioId } });
    if (!relatorio) {
      throw new Error("Relatório não encontrado.");
    }
    if (relatorio.situacao !== SituacaoRelatorio.AGUARDANDO_AVALIACAO) {
      throw new Error(`Não é possível aprovar um relatório em situação ${relatorio.situacao}.`);
    }

    const avaliadorId = await resolverAvaliadorId(tx, relatorio.cursoId);
    if (avaliadorId !== usuarioId) {
      throw new Error("Usuário não é o avaliador responsável por este relatório.");
    }

    await tx.relatorio.update({
      where: { id: relatorioId },
      data: { situacao: SituacaoRelatorio.APROVADO },
    });
    await tx.eventoAuditoria.create({
      data: { relatorioId, tipo: TipoEvento.APROVACAO, usuarioId },
    });
  });
}

export async function devolver(
  relatorioId: number,
  usuarioId: number,
  justificativa: string,
): Promise<void> {
  if (!justificativa.trim()) {
    throw new Error("Justificativa é obrigatória para devolver o relatório.");
  }

  await prisma.$transaction(async (tx) => {
    const relatorio = await tx.relatorio.findUnique({ where: { id: relatorioId } });
    if (!relatorio) {
      throw new Error("Relatório não encontrado.");
    }
    if (relatorio.situacao !== SituacaoRelatorio.AGUARDANDO_AVALIACAO) {
      throw new Error(`Não é possível devolver um relatório em situação ${relatorio.situacao}.`);
    }

    const avaliadorId = await resolverAvaliadorId(tx, relatorio.cursoId);
    if (avaliadorId !== usuarioId) {
      throw new Error("Usuário não é o avaliador responsável por este relatório.");
    }

    await tx.relatorio.update({
      where: { id: relatorioId },
      data: { situacao: SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE },
    });
    await tx.eventoAuditoria.create({
      data: { relatorioId, tipo: TipoEvento.DEVOLUCAO, usuarioId, justificativa },
    });
  });
}
