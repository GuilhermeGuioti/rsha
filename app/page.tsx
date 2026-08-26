import { exigirSessaoPagina, obterPerfis } from "../lib/auth/guards";
import { prisma } from "../lib/db";
import { acaoSair } from "./acoes";

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
      <form action={acaoSair}>
        <button type="submit" className="text-sm font-medium text-azul-interativo underline">
          Sair
        </button>
      </form>
    </main>
  );
}
