import { prisma } from "../../db";
import {
  listarVinculosDocente,
  listarVinculosCoordenador,
  vincularDocente,
  desvincularDocente,
  vincularCoordenador,
  desvincularCoordenador,
} from "../vinculos";
import { Perfil } from "../../../generated/prisma/client";

async function limpar() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "VinculoCoordenadorCurso", "VinculoDocenteCurso", "PeriodoLetivo", "Curso", "UsuarioPerfil", "Usuario" RESTART IDENTITY CASCADE`,
  );
}

async function obterAmbiente() {
  const [docente, curso, outroCurso] = await Promise.all([
    prisma.usuario.create({ data: { nome: "Helena", email: "helena@srha.dev" } }),
    prisma.curso.create({ data: { nome: "Fisioterapia" } }),
    prisma.curso.create({ data: { nome: "Enfermagem" } }),
  ]);
  const periodo = await prisma.periodoLetivo.create({
    data: {
      ano: 2026,
      semestre: 2,
      aberturaSubmissao: new Date("2026-08-01T00:00:00Z"),
      encerramentoSubmissao: new Date("2026-12-15T23:59:59Z"),
    },
  });
  return { docente, curso, outroCurso, periodo };
}

async function perfisDe(usuarioId: number) {
  const registros = await prisma.usuarioPerfil.findMany({ where: { usuarioId } });
  return registros.map((r) => r.perfil);
}

beforeEach(async () => {
  await limpar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("vincular docente ao curso cria o vínculo e o perfil DOCENTE", async () => {
  const { docente, curso, periodo } = await obterAmbiente();

  await vincularDocente(docente.id, curso.id, periodo.id);

  const vinculos = await listarVinculosDocente();
  expect(vinculos).toHaveLength(1);
  expect(vinculos[0]).toMatchObject({ docenteId: docente.id, cursoId: curso.id, periodoLetivoId: periodo.id });
  expect(await perfisDe(docente.id)).toEqual([Perfil.DOCENTE]);
});

test("vincular o mesmo docente ao mesmo curso e período duas vezes é rejeitado", async () => {
  const { docente, curso, periodo } = await obterAmbiente();
  await vincularDocente(docente.id, curso.id, periodo.id);

  await expect(vincularDocente(docente.id, curso.id, periodo.id)).rejects.toThrow(
    "Este docente já está vinculado a este curso neste período.",
  );
});

test("desvincular docente do único curso remove o perfil DOCENTE", async () => {
  const { docente, curso, periodo } = await obterAmbiente();
  await vincularDocente(docente.id, curso.id, periodo.id);
  const [vinculo] = await listarVinculosDocente();

  await desvincularDocente(vinculo.id);

  expect(await listarVinculosDocente()).toHaveLength(0);
  expect(await perfisDe(docente.id)).toEqual([]);
});

test("desvincular docente de um curso mantém o perfil DOCENTE se outro vínculo existe", async () => {
  const { docente, curso, outroCurso, periodo } = await obterAmbiente();
  await vincularDocente(docente.id, curso.id, periodo.id);
  await vincularDocente(docente.id, outroCurso.id, periodo.id);
  const [vinculo] = await listarVinculosDocente();

  await desvincularDocente(vinculo.id);

  expect(await listarVinculosDocente()).toHaveLength(1);
  expect(await perfisDe(docente.id)).toEqual([Perfil.DOCENTE]);
});

test("vincular coordenador ao curso cria o vínculo e o perfil COORDENADOR", async () => {
  const { docente: coordenador, curso } = await obterAmbiente();

  await vincularCoordenador(coordenador.id, curso.id);

  const vinculos = await listarVinculosCoordenador();
  expect(vinculos).toHaveLength(1);
  expect(vinculos[0]).toMatchObject({ coordenadorId: coordenador.id, cursoId: curso.id });
  expect(await perfisDe(coordenador.id)).toEqual([Perfil.COORDENADOR]);
});

test("vincular o mesmo coordenador ao mesmo curso duas vezes é rejeitado", async () => {
  const { docente: coordenador, curso } = await obterAmbiente();
  await vincularCoordenador(coordenador.id, curso.id);

  await expect(vincularCoordenador(coordenador.id, curso.id)).rejects.toThrow(
    "Este coordenador já está vinculado a este curso.",
  );
});

test("desvincular coordenador do único curso remove o perfil COORDENADOR", async () => {
  const { docente: coordenador, curso } = await obterAmbiente();
  await vincularCoordenador(coordenador.id, curso.id);
  const [vinculo] = await listarVinculosCoordenador();

  await desvincularCoordenador(vinculo.id);

  expect(await listarVinculosCoordenador()).toHaveLength(0);
  expect(await perfisDe(coordenador.id)).toEqual([]);
});
