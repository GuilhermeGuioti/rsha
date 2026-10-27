import Link from "next/link";
import type { ReactNode } from "react";

// Link no meio de uma frase ou de um caminho de navegação: só a cor e o
// sublinhado no hover o separam do texto em volta.
export function LinkTexto({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-sm font-semibold text-azul-interativo hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
