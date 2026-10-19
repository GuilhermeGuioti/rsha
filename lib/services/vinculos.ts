import { prisma } from "../db";
import { Perfil } from "../../generated/prisma/client";
import { sincronizarPerfil } from "./perfis";

export async function listarVinculosDocente() {
  return prisma.vinculoDocenteCurso.findMany({
    include: { docente: true, curso: true, periodo: true },
    orderBy: [
      { periodo: { ano: "desc" } },
      { periodo: { semestre: "desc" } },
      { curso: { nome: "asc" } },
      { docente: { nome: "asc" } },
    ],
  });
}

export async function listarVinculosCoordenador() {
  return prisma.vinculoCoordenadorCurso.findMany({
    include: { coordenador: true, curso: true },
    orderBy: [{ curso: { nome: "asc" } }, { coordenador: { nome: "asc" } }],
  });
}

export async function vincularDocente(docenteId: number, cursoId: number, periodoLetivoId: number): Promise<void> {
  const existente = await prisma.vinculoDocenteCurso.findUnique({
    where: { docenteId_cursoId_periodoLetivoId: { docenteId, cursoId, periodoLetivoId } },
  });
  if (existente) {
    throw new Error("Este docente já está vinculado a este curso neste período.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.vinculoDocenteCurso.create({ data: { docenteId, cursoId, periodoLetivoId } });
    await sincronizarPerfil(tx, docenteId, Perfil.DOCENTE, true);
  });
}

export async function desvincularDocente(vinculoId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const vinculo = await tx.vinculoDocenteCurso.findUnique({ where: { id: vinculoId } });
    if (!vinculo) {
      throw new Error("Vínculo não encontrado.");
    }
    // Arquivo e painel partem dos vínculos: sem ele, o relatório — mesmo
    // aprovado — sumiria da consulta (RNF09). Mesma regra do RF03 para curso
    // com relatório: bloqueia com mensagem em vez de excluir.
    const relatorio = await tx.relatorio.findUnique({
      where: {
        docenteId_cursoId_periodoLetivoId: {
          docenteId: vinculo.docenteId,
          cursoId: vinculo.cursoId,
          periodoLetivoId: vinculo.periodoLetivoId,
        },
      },
    });
    if (relatorio) {
      throw new Error(
        "Este docente já começou o relatório deste curso neste período — o vínculo não pode ser removido.",
      );
    }
    await tx.vinculoDocenteCurso.delete({ where: { id: vinculoId } });
    const restam = await tx.vinculoDocenteCurso.count({ where: { docenteId: vinculo.docenteId } });
    await sincronizarPerfil(tx, vinculo.docenteId, Perfil.DOCENTE, restam > 0);
  });
}

export async function vincularCoordenador(coordenadorId: number, cursoId: number): Promise<void> {
  const existente = await prisma.vinculoCoordenadorCurso.findUnique({
    where: { coordenadorId_cursoId: { coordenadorId, cursoId } },
  });
  if (existente) {
    throw new Error("Este coordenador já está vinculado a este curso.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.vinculoCoordenadorCurso.create({ data: { coordenadorId, cursoId } });
    await sincronizarPerfil(tx, coordenadorId, Perfil.COORDENADOR, true);
  });
}

export async function desvincularCoordenador(vinculoId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const vinculo = await tx.vinculoCoordenadorCurso.delete({ where: { id: vinculoId } });
    const restam = await tx.vinculoCoordenadorCurso.count({ where: { coordenadorId: vinculo.coordenadorId } });
    await sincronizarPerfil(tx, vinculo.coordenadorId, Perfil.COORDENADOR, restam > 0);
  });
}
