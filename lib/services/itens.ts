import { prisma } from "../db";
import { DiaSemana, Prisma, SituacaoRelatorio } from "../../app/generated/prisma/client";

type DadosItem = {
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
  if (relatorio.situacao === SituacaoRelatorio.APROVADO) {
    throw new Error("Relatório aprovado não pode ser alterado.");
  }
  return relatorio;
}

async function recalcularTotal(cliente: Prisma.TransactionClient, relatorioId: number): Promise<void> {
  const itens = await cliente.itemAtividade.findMany({ where: { relatorioId } });
  const total = itens.reduce((soma, item) => soma + item.horas.toNumber(), 0);
  await cliente.relatorio.update({ where: { id: relatorioId }, data: { cargaHorariaTotal: total } });
}

export async function adicionarItem(relatorioId: number, dados: DadosItem): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await exigirRelatorioEditavel(tx, relatorioId);
    await tx.itemAtividade.create({ data: { relatorioId, ...dados } });
    await recalcularTotal(tx, relatorioId);
  });
}

export async function removerItem(relatorioId: number, itemId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await exigirRelatorioEditavel(tx, relatorioId);
    await tx.itemAtividade.delete({ where: { id: itemId, relatorioId } });
    await recalcularTotal(tx, relatorioId);
  });
}
