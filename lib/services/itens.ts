import { prisma } from "../db";
import { DiaSemana, Prisma, SituacaoRelatorio } from "../../generated/prisma/client";

export type DadosItem = {
  tipoAtividadeId: number;
  horas: number;
  diaSemana: DiaSemana;
  horario: string;
  descricao: string;
};

async function exigirRelatorioEditavel(cliente: Prisma.TransactionClient, relatorioId: number) {
  const relatorio = await cliente.relatorio.findUnique({ where: { id: relatorioId } });
  if (!relatorio) {
    throw new Error("Relatório não encontrado.");
  }
  // A máquina de estados não tem transição de edição a partir de
  // AGUARDANDO_AVALIACAO: o que o coordenador abre é o que o docente enviou.
  if (
    relatorio.situacao !== SituacaoRelatorio.RASCUNHO &&
    relatorio.situacao !== SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE
  ) {
    throw new Error(`Não é possível alterar os itens de um relatório em situação ${relatorio.situacao}.`);
  }
  return relatorio;
}

/**
 * Grava a lista inteira de itens do relatório: o que o docente vê na tela é o
 * que fica no banco. Substituir tudo evita rastrear id de linha na interface —
 * itens não são referenciados por nada além do próprio relatório.
 * `cargaHorariaTotal` é recalculada na mesma transação (o cliente nunca envia).
 */
export async function salvarItens(relatorioId: number, itens: DadosItem[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await exigirRelatorioEditavel(tx, relatorioId);
    await tx.itemAtividade.deleteMany({ where: { relatorioId } });
    await tx.itemAtividade.createMany({ data: itens.map((item) => ({ relatorioId, ...item })) });
    await tx.relatorio.update({
      where: { id: relatorioId },
      data: { cargaHorariaTotal: itens.reduce((soma, item) => soma + item.horas, 0) },
    });
  });
}
