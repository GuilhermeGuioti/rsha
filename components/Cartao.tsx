import type { ReactNode } from "react";

// Branco, borda fina e sombra azulada: a base do cartão e das caixinhas que
// se destacam do papel (logo, botão Voltar), cada uma com o próprio canto.
export const classeSuperficie = "border border-borda bg-superficie shadow-cartao";

// Superfície de conteúdo de todas as telas. Exportada também como classe para
// quando o cartão é um <Link>, <nav> ou outro elemento que não cabe no `como`.
export const classeCartao = `rounded-2xl ${classeSuperficie}`;

// `faixa` é a cor (classe bg-*) de uma barra fina no topo, que repete a
// situação do conteúdo — o selo por extenso continua dentro do cartão.
export function Cartao({
  como: Elemento = "div",
  faixa,
  className,
  children,
}: {
  como?: "div" | "section" | "article" | "aside";
  faixa?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Elemento className={`${classeCartao} ${faixa ? "relative overflow-hidden" : ""} ${className ?? ""}`}>
      {faixa && <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${faixa}`} />}
      {children}
    </Elemento>
  );
}
