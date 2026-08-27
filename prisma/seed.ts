import "dotenv/config";
import { Perfil } from "../app/generated/prisma/enums";
import { prisma } from "../lib/db";

// Só a secretaria inicial. Cursos, tipos de atividade, período letivo e os
// demais usuários são cadastrados por ela via UI (app/admin/*), não pelo seed.
export async function seed() {
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
