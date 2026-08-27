import type { ReactNode } from "react";

type CorAcao = "interativo" | "devolvido";

const cores: Record<CorAcao, string> = {
  interativo: "text-azul-interativo hover:bg-[#e9f6fc]",
  devolvido: "text-estado-devolvido hover:bg-[#fbeaea]",
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
      className={`inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo ${cores[cor]}`}
    >
      {children}
    </button>
  );
}
