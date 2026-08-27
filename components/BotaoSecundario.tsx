import type { ReactNode } from "react";

export function BotaoSecundario({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center rounded-md border border-[#92cde9] bg-superficie px-4 text-[15px] font-medium text-azul-interativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
    >
      {children}
    </button>
  );
}
