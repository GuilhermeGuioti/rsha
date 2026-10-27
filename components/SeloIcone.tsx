import type { ReactNode } from "react";

const tamanhos = {
  md: "h-11 w-11 rounded-xl",
  lg: "h-12 w-12 rounded-2xl",
  xl: "h-14 w-14 rounded-2xl",
};

// Quadrado com o ícone de uma seção ou atalho. O tom "branco" é para quando o
// selo fica sobre um fundo já colorido; aí a cor do ícone vem de quem usa.
export function SeloIcone({
  tamanho = "md",
  tom = "azul",
  className,
  children,
}: {
  tamanho?: keyof typeof tamanhos;
  tom?: "azul" | "branco";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={`flex flex-none items-center justify-center ${tamanhos[tamanho]} ${
        tom === "azul" ? "bg-azul-suave text-azul-interativo" : "bg-superficie"
      } ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
