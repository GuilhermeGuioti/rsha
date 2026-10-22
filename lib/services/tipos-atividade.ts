import { prisma } from "../db";

export type DadosTipoAtividade = {
  descricao: string;
  ativo: boolean;
};

export async function listarTiposAtividade() {
  return prisma.tipoAtividade.findMany({
    orderBy: { descricao: "asc" },
    include: { _count: { select: { itens: true } } },
  });
}

async function exigirDescricaoDisponivel(descricao: string, ignorarId?: number): Promise<void> {
  const existente = await prisma.tipoAtividade.findUnique({ where: { descricao } });
  if (existente && existente.id !== ignorarId) {
    throw new Error("Já existe um tipo de atividade com esta descrição.");
  }
}

export async function criarTipoAtividade(dados: DadosTipoAtividade): Promise<number> {
  await exigirDescricaoDisponivel(dados.descricao);
  const tipo = await prisma.tipoAtividade.create({ data: dados });
  return tipo.id;
}

export async function atualizarTipoAtividade(id: number, dados: DadosTipoAtividade): Promise<void> {
  await exigirDescricaoDisponivel(dados.descricao, id);
  await prisma.tipoAtividade.update({ where: { id }, data: dados });
}
