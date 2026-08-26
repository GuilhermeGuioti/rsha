import "dotenv/config";
import { Perfil } from "../app/generated/prisma/enums";
import { prisma } from "../lib/db";

// Só o admin inicial. Cursos, tipos de atividade, período letivo e os demais
// usuários são cadastrados por ele via UI (app/admin/*), não pelo seed.
export async function seed() {
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@srha.dev" },
    update: {},
    create: { nome: "Administrador", email: "admin@srha.dev" },
  });

  await prisma.usuarioPerfil.upsert({
    where: { usuarioId_perfil: { usuarioId: admin.id, perfil: Perfil.ADMINISTRADOR } },
    update: {},
    create: { usuarioId: admin.id, perfil: Perfil.ADMINISTRADOR },
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
