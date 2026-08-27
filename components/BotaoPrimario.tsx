import type { ReactNode } from "react";

type BotaoPrimarioProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  form?: string;
  disabled?: boolean;
  icone?: boolean;
};

export function BotaoPrimario({ children, onClick, type = "button", form, disabled, icone }: BotaoPrimarioProps) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-azul-institucional bg-azul-institucional px-4 text-[15px] font-medium text-white hover:bg-azul-interativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${icone ? "min-w-[212px]" : ""}`}
    >
      {icone && <span aria-hidden="true">+</span>}
      {children}
    </button>
  );
}
