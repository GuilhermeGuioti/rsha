import { prisma } from "../db";
import { Prisma, SituacaoRelatorio, TipoEvento } from "../../app/generated/prisma/client";

/**
 * Roteamento automático (RF22): o avaliador é o coordenador vinculado ao curso.
 * Se o autor for o próprio coordenador (ou não houver coordenador vinculado),
 * cai para o avaliadorAlternativo do curso. Sem alternativo, não há avaliador.
 */
export async function resolverAvaliadorId(
  cliente: Prisma.TransactionClient,
  cursoId: number,
  docenteId: number,
): Promise<number | null> {
  const [curso, vinculo] = await Promise.all([
    cliente.curso.findUniqueOrThrow({ where: { id: cursoId } }),
    cliente.vinculoCoordenadorCurso.findFirst({ where: { cursoId }, orderBy: { id: "asc" } }),
  ]);

  if (vinculo && vinculo.coordenadorId !== docenteId) {
    return vinculo.coordenadorId;
  }
  return curso.avaliadorAlternativoId;
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

  const relatorio = await prisma.relatorio.upsert({
    where: { docenteId_cursoId_periodoLetivoId: { docenteId, cursoId, periodoLetivoId } },
    create: { docenteId, cursoId, periodoLetivoId },
    update: {},
  });
  return relatorio.id;
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

    const avaliadorId = await resolverAvaliadorId(tx, relatorio.cursoId, relatorio.docenteId);
    if (avaliadorId === null) {
      throw new Error(
        "Nenhum avaliador disponível para este curso — cadastre um avaliador alternativo antes de submeter.",
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

    const avaliadorId = await resolverAvaliadorId(tx, relatorio.cursoId, relatorio.docenteId);
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

    const avaliadorId = await resolverAvaliadorId(tx, relatorio.cursoId, relatorio.docenteId);
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
