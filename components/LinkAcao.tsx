import Link from "next/link";
import type { ReactNode } from "react";

// Exportada para o link de download do PDF: rota GET de arquivo vai em <a>,
// não em <Link>, que faria prefetch dela.
export const classeLinkAcao =
  "inline-flex min-h-11 items-center rounded-lg px-2.5 text-[15px] font-semibold text-azul-interativo transition-colors hover:bg-azul-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo";

// Ação no fim de uma linha de lista ("Abrir", "Ver").
export function LinkAcao({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${classeLinkAcao} ${className ?? ""}`}>
      {children}
    </Link>
  );
}
