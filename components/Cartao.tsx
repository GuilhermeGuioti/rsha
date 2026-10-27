import type { ReactNode } from "react";

// Superfície de conteúdo de todas as telas: branco, canto largo, borda fina e
// sombra azulada. Exportada também como classe para quando o cartão é um
// <Link>, <nav> ou outro elemento que não cabe no `como`.
export const classeCartao = "rounded-2xl border border-borda bg-superficie shadow-cartao";

export function Cartao({
  como: Elemento = "div",
  className,
  children,
}: {
  como?: "div" | "section" | "article" | "aside";
  className?: string;
  children: ReactNode;
}) {
  return <Elemento className={`${classeCartao} ${className ?? ""}`}>{children}</Elemento>;
}
