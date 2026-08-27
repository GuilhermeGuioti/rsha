import { Perfil, Prisma } from "../../generated/prisma/client";

// Perfil é consequência de cadastro (secretaria marcada na ficha, vínculo com
// curso criado) — nunca editado direto. Garante o UsuarioPerfil sem duplicar
// nem remover um perfil que ainda tem outra razão de existir.
export async function sincronizarPerfil(
  cliente: Prisma.TransactionClient,
  usuarioId: number,
  perfil: Perfil,
  deveTer: boolean,
): Promise<void> {
  const existente = await cliente.usuarioPerfil.findUnique({
    where: { usuarioId_perfil: { usuarioId, perfil } },
  });
  if (deveTer && !existente) {
    await cliente.usuarioPerfil.create({ data: { usuarioId, perfil } });
  } else if (!deveTer && existente) {
    await cliente.usuarioPerfil.delete({ where: { id: existente.id } });
  }
}
