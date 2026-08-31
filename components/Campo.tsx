import type { ReactNode } from "react";

export const classeCampo =
  "min-h-11 rounded-md border border-borda px-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo";
// pr-9 (não px-3 herdado) — a seta nativa do <select> precisa de mais
// respiro da borda direita do que um input de texto.
export const classeCampoSelect =
  "min-h-11 rounded-md border border-borda bg-superficie pl-3 pr-9 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo";

export function Campo({
  rotulo,
  htmlFor,
  className,
  children,
}: {
  rotulo: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-[13px] font-medium text-tinta-suave">{rotulo}</span>
      {children}
    </label>
  );
}
