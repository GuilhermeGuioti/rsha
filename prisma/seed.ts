import "dotenv/config";
import { Perfil } from "../app/generated/prisma/enums";
import { prisma } from "../lib/db";

async function main() {
  await Promise.all(
    ["Orientação de TCC", "Supervisão de Estágio", "Participação em NBE"].map(
      (descricao) =>
        prisma.tipoAtividade.upsert({
          where: { descricao },
          update: {},
          create: { descricao },
        }),
    ),
  );

  const docente = await prisma.usuario.upsert({
    where: { email: "docente@srha.dev" },
    update: {},
    create: { nome: "Docente Teste", email: "docente@srha.dev" },
  });

  const coordenador = await prisma.usuario.upsert({
    where: { email: "coordenador@srha.dev" },
    update: {},
    create: { nome: "Coordenador Teste", email: "coordenador@srha.dev" },
  });

  const coordenadorDocente = await prisma.usuario.upsert({
    where: { email: "coordenador.docente@srha.dev" },
    update: {},
    create: {
      nome: "Coordenador Docente Teste",
      email: "coordenador.docente@srha.dev",
    },
  });

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@srha.dev" },
    update: {},
    create: { nome: "Administrador Teste", email: "admin@srha.dev" },
  });

  await Promise.all([
    prisma.usuarioPerfil.upsert({
      where: { usuarioId_perfil: { usuarioId: docente.id, perfil: Perfil.DOCENTE } },
      update: {},
      create: { usuarioId: docente.id, perfil: Perfil.DOCENTE },
    }),
    prisma.usuarioPerfil.upsert({
      where: {
        usuarioId_perfil: { usuarioId: coordenador.id, perfil: Perfil.COORDENADOR },
      },
      update: {},
      create: { usuarioId: coordenador.id, perfil: Perfil.COORDENADOR },
    }),
    prisma.usuarioPerfil.upsert({
      where: {
        usuarioId_perfil: {
          usuarioId: coordenadorDocente.id,
          perfil: Perfil.COORDENADOR,
        },
      },
      update: {},
      create: { usuarioId: coordenadorDocente.id, perfil: Perfil.COORDENADOR },
    }),
    prisma.usuarioPerfil.upsert({
      where: {
        usuarioId_perfil: { usuarioId: coordenadorDocente.id, perfil: Perfil.DOCENTE },
      },
      update: {},
      create: { usuarioId: coordenadorDocente.id, perfil: Perfil.DOCENTE },
    }),
    prisma.usuarioPerfil.upsert({
      where: {
        usuarioId_perfil: { usuarioId: admin.id, perfil: Perfil.ADMINISTRADOR },
      },
      update: {},
      create: { usuarioId: admin.id, perfil: Perfil.ADMINISTRADOR },
    }),
  ]);

  const cursoEngenhariaSoftware = await prisma.curso.upsert({
    where: { nome: "Engenharia de Software" },
    update: { avaliadorAlternativoId: coordenador.id },
    create: {
      nome: "Engenharia de Software",
      avaliadorAlternativoId: coordenador.id,
    },
  });

  const cursoCienciaComputacao = await prisma.curso.upsert({
    where: { nome: "Ciência da Computação" },
    update: {},
    create: { nome: "Ciência da Computação" },
  });

  const cursoSistemasInformacao = await prisma.curso.upsert({
    where: { nome: "Sistemas de Informação" },
    update: {},
    create: { nome: "Sistemas de Informação" },
  });

  const periodo = await prisma.periodoLetivo.upsert({
    where: { ano_semestre: { ano: 2026, semestre: 2 } },
    update: {},
    create: {
      ano: 2026,
      semestre: 2,
      aberturaSubmissao: new Date("2026-08-01T00:00:00Z"),
      encerramentoSubmissao: new Date("2026-12-15T23:59:59Z"),
    },
  });

  await Promise.all([
    prisma.vinculoDocenteCurso.upsert({
      where: {
        docenteId_cursoId_periodoLetivoId: {
          docenteId: docente.id,
          cursoId: cursoCienciaComputacao.id,
          periodoLetivoId: periodo.id,
        },
      },
      update: {},
      create: {
        docenteId: docente.id,
        cursoId: cursoCienciaComputacao.id,
        periodoLetivoId: periodo.id,
      },
    }),
    prisma.vinculoDocenteCurso.upsert({
      where: {
        docenteId_cursoId_periodoLetivoId: {
          docenteId: docente.id,
          cursoId: cursoSistemasInformacao.id,
          periodoLetivoId: periodo.id,
        },
      },
      update: {},
      create: {
        docenteId: docente.id,
        cursoId: cursoSistemasInformacao.id,
        periodoLetivoId: periodo.id,
      },
    }),
    prisma.vinculoDocenteCurso.upsert({
      where: {
        docenteId_cursoId_periodoLetivoId: {
          docenteId: coordenadorDocente.id,
          cursoId: cursoEngenhariaSoftware.id,
          periodoLetivoId: periodo.id,
        },
      },
      update: {},
      create: {
        docenteId: coordenadorDocente.id,
        cursoId: cursoEngenhariaSoftware.id,
        periodoLetivoId: periodo.id,
      },
    }),
    prisma.vinculoCoordenadorCurso.upsert({
      where: {
        coordenadorId_cursoId: {
          coordenadorId: coordenador.id,
          cursoId: cursoCienciaComputacao.id,
        },
      },
      update: {},
      create: { coordenadorId: coordenador.id, cursoId: cursoCienciaComputacao.id },
    }),
    prisma.vinculoCoordenadorCurso.upsert({
      where: {
        coordenadorId_cursoId: {
          coordenadorId: coordenadorDocente.id,
          cursoId: cursoEngenhariaSoftware.id,
        },
      },
      update: {},
      create: {
        coordenadorId: coordenadorDocente.id,
        cursoId: cursoEngenhariaSoftware.id,
      },
    }),
  ]);

  console.log("Seed concluído.");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
