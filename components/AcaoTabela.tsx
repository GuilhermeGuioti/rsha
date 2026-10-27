import type { ReactNode } from "react";

type CorAcao = "interativo" | "devolvido";

const cores: Record<CorAcao, string> = {
  interativo: "text-azul-interativo hover:bg-azul-suave",
  devolvido: "text-estado-devolvido hover:bg-estado-devolvido-suave",
};

export function AcaoTabela({
  onClick,
  rotulo,
  cor = "interativo",
  children,
}: {
  onClick: () => void;
  rotulo: string;
  cor?: CorAcao;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo ${cores[cor]}`}
    >
      {children}
    </button>
  );
}
