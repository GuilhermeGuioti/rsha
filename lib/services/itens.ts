import { prisma } from "../db";
import { DiaSemana, Prisma, SituacaoRelatorio } from "../../generated/prisma/client";
import { exigirDentroDoPrazo, travarRelatorio } from "./workflow";

export type DadosItem = {
  tipoAtividadeId: number;
  horas: number;
  diaSemana: DiaSemana;
  horario: string;
  descricao: string;
};

async function exigirRelatorioEditavel(cliente: Prisma.TransactionClient, relatorioId: number) {
  // Sem a trava, salvar e enviar ao mesmo tempo (duas abas) trocava os itens
  // de um relatório que já tinha saído para a coordenação.
  await travarRelatorio(cliente, relatorioId);
  const relatorio = await cliente.relatorio.findUnique({ where: { id: relatorioId }, include: { periodo: true } });
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
  // Rascunho só se edita na janela do período; devolvido, até o prazo
  // estendido da devolução (ver prazoDeEntrega).
  await exigirDentroDoPrazo(cliente, relatorio);
  return relatorio;
}

// Tipo inativado sai das opções, mas item que já o usava neste relatório
// continua valendo — a mesma regra do <select> da tela, repetida aqui porque a
// Server Action é chamável sem passar por ela.
async function exigirTiposPermitidos(cliente: Prisma.TransactionClient, relatorioId: number, itens: DadosItem[]) {
  const ids = [...new Set(itens.map((item) => item.tipoAtividadeId))];
  const permitidos = await cliente.tipoAtividade.count({
    where: { id: { in: ids }, OR: [{ ativo: true }, { itens: { some: { relatorioId } } }] },
  });
  if (permitidos !== ids.length) {
    throw new Error("Tipo de atividade inativo ou inexistente. Escolha outro tipo para o item.");
  }
}

/**
 * Grava a lista inteira de itens do relatório: o que o docente vê na tela é o
 * que fica no banco. Substituir tudo evita rastrear id de linha na interface —
 * itens não são referenciados por nada além do próprio relatório.
 * `cargaHorariaTotal` é recalculada na mesma transação (o cliente nunca envia).
 */
export async function salvarItens(relatorioId: number, itens: DadosItem[]): Promise<void> {
  // Horas em centésimos inteiros: o banco guarda Decimal(5,2) e arredondaria
  // cada item por conta própria, enquanto o total somado em float sairia de
  // valores não arredondados (0,125 + 0,125 gravaria itens 0,13 + 0,13 e total
  // 0,25). Arredondando aqui, o total é exatamente a soma do que é gravado.
  const centesimos = itens.map((item) => Math.round(item.horas * 100));
  await prisma.$transaction(async (tx) => {
    await exigirRelatorioEditavel(tx, relatorioId);
    await exigirTiposPermitidos(tx, relatorioId, itens);
    await tx.itemAtividade.deleteMany({ where: { relatorioId } });
    await tx.itemAtividade.createMany({
      data: itens.map((item, indice) => ({ relatorioId, ...item, horas: centesimos[indice] / 100 })),
    });
    await tx.relatorio.update({
      where: { id: relatorioId },
      data: { cargaHorariaTotal: centesimos.reduce((soma, valor) => soma + valor, 0) / 100 },
    });
  });
}
