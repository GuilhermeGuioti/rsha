import { exigirSessaoPagina } from "../../../lib/auth/guards";
import { prisma } from "../../../lib/db";
import { NavAdmin } from "../../../components/NavAdmin";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const sessao = await exigirSessaoPagina();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: sessao.usuarioId } });

  return (
    <div className="flex flex-1 flex-col">
      <NavAdmin nomeUsuario={usuario.nome} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
