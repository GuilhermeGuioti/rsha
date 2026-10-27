import type { ReactNode } from "react";

// Linha curta em caixa alta acima do título: diz de onde é a tela ou o modal
// ("SRHA · Acesso institucional", "Administração · Cursos").
export function Sobretitulo({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold tracking-[0.14em] text-azul-interativo uppercase">{children}</p>;
}
