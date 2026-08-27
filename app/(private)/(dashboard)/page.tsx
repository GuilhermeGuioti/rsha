import Link from "next/link";
import { exigirSessaoPagina, obterPerfis } from "../../lib/auth/guards";
import { prisma } from "../../lib/db";
import { acaoSair } from "../../lib/auth/acoes";
import { Perfil } from "../../generated/prisma/client";

export default async function Home() {
  const sessao = await exigirSessaoPagina();

  const [usuario, perfis] = await Promise.all([
    prisma.usuario.findUniqueOrThrow({ where: { id: sessao.usuarioId } }),
    obterPerfis(sessao.usuarioId),
  ]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-papel px-4">
      <p className="font-sans text-sm text-tinta-suave">
        SRHA — em construção. Logado como <span className="font-medium text-tinta">{usuario.nome}</span>{" "}
        ({perfis.join(", ")})
      </p>
      {/* Só existe tela de admin até agora — a nav do docente/coordenador vem
          junto com o layout (private)/(dashboard) quando essas telas existirem. */}
      {perfis.includes(Perfil.SECRETARIA) && (
        <nav className="flex gap-4 text-sm">
          <Link href="/admin/cursos" className="font-medium text-azul-interativo underline">
            Cursos
          </Link>
          <Link href="/admin/usuarios" className="font-medium text-azul-interativo underline">
            Usuários
          </Link>
          <Link href="/admin/vinculos" className="font-medium text-azul-interativo underline">
            Vínculos
          </Link>
          <Link href="/admin/periodos" className="font-medium text-azul-interativo underline">
            Períodos
          </Link>
        </nav>
      )}
      <form action={acaoSair}>
        <button type="submit" className="text-sm font-medium text-azul-interativo underline">
          Sair
        </button>
      </form>
    </main>
  );
}
