import { prisma } from "../db";

export type DadosCurso = {
  nome: string;
  ativo: boolean;
};

export async function listarCursos() {
  return prisma.curso.findMany({
    orderBy: { nome: "asc" },
    include: {
      coordenadores: { include: { coordenador: true } },
      _count: { select: { docentes: true } },
    },
  });
}

async function exigirNomeDisponivel(nome: string, ignorarId?: number): Promise<void> {
  const existente = await prisma.curso.findUnique({ where: { nome } });
  if (existente && existente.id !== ignorarId) {
    throw new Error("Já existe um curso com este nome.");
  }
}

export async function criarCurso(dados: DadosCurso): Promise<number> {
  await exigirNomeDisponivel(dados.nome);
  const curso = await prisma.curso.create({ data: dados });
  return curso.id;
}

export async function atualizarCurso(id: number, dados: DadosCurso): Promise<void> {
  await exigirNomeDisponivel(dados.nome, id);
  await prisma.curso.update({ where: { id }, data: dados });
}
