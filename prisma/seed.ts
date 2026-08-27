import "dotenv/config";
import { Perfil } from "../generated/prisma/enums";
import { prisma } from "../lib/db";

// A secretaria inicial e os tipos de atividade (lista fixa do formulário de
// papel — docs/prompts-iniciais-srha.txt). Cursos, período letivo e os demais
// usuários são cadastrados pela secretaria via UI (app/admin/*).
const TIPOS_ATIVIDADE = ["Orientação de TCC", "Supervisão de Estágio", "Participação em NBE"];

export async function seed() {
  for (const descricao of TIPOS_ATIVIDADE) {
    await prisma.tipoAtividade.upsert({ where: { descricao }, update: {}, create: { descricao } });
  }

  const secretaria = await prisma.usuario.upsert({
    where: { email: "admin@srha.dev" },
    update: {},
    create: { nome: "Secretaria Acadêmica", email: "admin@srha.dev" },
  });

  await prisma.usuarioPerfil.upsert({
    where: { usuarioId_perfil: { usuarioId: secretaria.id, perfil: Perfil.SECRETARIA } },
    update: {},
    create: { usuarioId: secretaria.id, perfil: Perfil.SECRETARIA },
  });

  console.log("Seed concluído.");
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
