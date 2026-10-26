import "dotenv/config";
import { Perfil } from "../generated/prisma/enums";
import { prisma } from "../lib/db";

// A secretaria inicial. Os tipos de atividade são lista fixa e vêm da
// migration tipos_atividade_fixos, não daqui. Cursos, período letivo e os
// demais usuários são cadastrados pela secretaria via UI (app/admin/*) — fora
// de produção, o cenário de desenvolvimento abaixo poupa esse cadastro à mão.

async function criarUsuario(nome: string, email: string) {
  return prisma.usuario.upsert({ where: { email }, update: { nome }, create: { nome, email } });
}

async function darPerfil(usuarioId: number, perfil: Perfil) {
  await prisma.usuarioPerfil.upsert({
    where: { usuarioId_perfil: { usuarioId, perfil } },
    update: {},
    create: { usuarioId, perfil },
  });
}

/**
 * Em produção o login é pelo Entra ID, então a primeira secretaria precisa
 * ser um e-mail institucional real — vem do ambiente, nunca do código. Fora
 * de produção é a conta fixa do login falso (o botão de /login entra com ela).
 */
function secretariaInicial(): { nome: string; email: string } {
  if (process.env.NODE_ENV !== "production") {
    return { nome: "Secretaria Acadêmica", email: "admin@srha.dev" };
  }
  const email = process.env.SECRETARIA_INICIAL_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error(
      "Defina SECRETARIA_INICIAL_EMAIL (e, opcionalmente, SECRETARIA_INICIAL_NOME) com a conta institucional de quem vai administrar o sistema.",
    );
  }
  return { nome: process.env.SECRETARIA_INICIAL_NOME?.trim() || "Secretaria Acadêmica", email };
}

export async function seed() {
  const inicial = secretariaInicial();

  const secretaria = await criarUsuario(inicial.nome, inicial.email);
  await darPerfil(secretaria.id, Perfil.SECRETARIA);

  if (process.env.NODE_ENV !== "production") {
    await seedDesenvolvimento();
  }

  console.log("Seed concluído.");
}

/**
 * Cenário de teste do login falso (CLAUDE.md § Login falso para
 * desenvolvimento): um docente em dois cursos com coordenadores diferentes,
 * um coordenador de um curso só, e um coordenador que também dá aula no
 * próprio curso — para testar a autoaprovação.
 *
 * Não cria nenhum Relatorio: a linha nasce sob demanda, no primeiro clique do
 * docente. É isso que faz "não iniciado" existir no painel.
 */
async function seedDesenvolvimento() {
  const [helena, claudia, marcos, paulo] = await Promise.all([
    criarUsuario("Helena Vasconcelos", "helena@baraodemaua.br"),
    criarUsuario("Cláudia Ferrari", "claudia@baraodemaua.br"),
    criarUsuario("Marcos Rinaldi", "marcos@baraodemaua.br"),
    criarUsuario("Paulo Tavares", "paulo@baraodemaua.br"),
  ]);

  await Promise.all([
    darPerfil(helena.id, Perfil.DOCENTE),
    darPerfil(claudia.id, Perfil.COORDENADOR),
    darPerfil(marcos.id, Perfil.COORDENADOR),
    darPerfil(paulo.id, Perfil.COORDENADOR),
    darPerfil(paulo.id, Perfil.DOCENTE),
  ]);

  const cursos = new Map<string, number>();
  for (const nome of ["Fisioterapia", "Nutrição", "Educação Física"]) {
    const curso = await prisma.curso.upsert({ where: { nome }, update: {}, create: { nome } });
    cursos.set(nome, curso.id);
  }

  // Janela sempre aberta a partir do dia em que o seed roda — o prazo mostrado
  // na home fica a quatro dias, como no mockup.
  const hoje = new Date();
  const emDias = (dias: number) => new Date(hoje.getTime() + dias * 86_400_000);
  const prazos = { aberturaSubmissao: emDias(-30), encerramentoSubmissao: emDias(4) };
  const ano = hoje.getFullYear();
  const semestre = hoje.getMonth() < 6 ? 1 : 2;

  const periodo = await prisma.periodoLetivo.upsert({
    where: { ano_semestre: { ano, semestre } },
    update: prazos,
    create: { ano, semestre, ...prazos },
  });

  const vinculosDocente: [number, string][] = [
    [helena.id, "Fisioterapia"],
    [helena.id, "Nutrição"],
    [paulo.id, "Educação Física"],
  ];
  for (const [docenteId, nomeCurso] of vinculosDocente) {
    const cursoId = cursos.get(nomeCurso)!;
    await prisma.vinculoDocenteCurso.upsert({
      where: {
        docenteId_cursoId_periodoLetivoId: { docenteId, cursoId, periodoLetivoId: periodo.id },
      },
      update: {},
      create: { docenteId, cursoId, periodoLetivoId: periodo.id },
    });
  }

  const vinculosCoordenador: [number, string][] = [
    [claudia.id, "Fisioterapia"],
    [marcos.id, "Nutrição"],
    [paulo.id, "Educação Física"],
  ];
  for (const [coordenadorId, nomeCurso] of vinculosCoordenador) {
    const cursoId = cursos.get(nomeCurso)!;
    await prisma.vinculoCoordenadorCurso.upsert({
      where: { coordenadorId_cursoId: { coordenadorId, cursoId } },
      update: {},
      create: { coordenadorId, cursoId },
    });
  }

  console.log(
    [
      "Cenário de desenvolvimento pronto. Entre pelo campo de e-mail em /login:",
      "  helena@baraodemaua.br   docente em Fisioterapia e Nutrição (coordenadores diferentes)",
      "  claudia@baraodemaua.br  coordena Fisioterapia",
      "  marcos@baraodemaua.br   coordena Nutrição",
      "  paulo@baraodemaua.br    coordena e dá aula em Educação Física (testa autoaprovação)",
      "  admin@srha.dev          secretaria acadêmica",
    ].join("\n"),
  );
}

if (require.main === module) {
  seed()
    .catch((erro) => {
      console.error(erro);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
