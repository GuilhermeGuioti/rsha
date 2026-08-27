import type { ReactNode } from "react";

type CorAcao = "interativo" | "devolvido";

const cores: Record<CorAcao, string> = {
  interativo: "text-azul-interativo",
  devolvido: "text-estado-devolvido",
};

export function LinkAcaoTabela({
  onClick,
  cor = "interativo",
  children,
}: {
  onClick: () => void;
  cor?: CorAcao;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo ${cores[cor]}`}
    >
      {children}
    </button>
  );
}
