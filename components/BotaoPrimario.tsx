import type { ReactNode } from "react";
import { IconeMais } from "./Icones";

// Exportada para o botão de entrada do /login, que precisa ocupar a largura
// toda do cartão.
export const classeBotaoPrimario =
  "flex min-h-11 items-center justify-center gap-2 rounded-lg bg-azul-interativo px-5 text-[15px] font-semibold text-white shadow-botao transition-[background-color,box-shadow,translate] hover:bg-azul-escuro active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";

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
      className={`${classeBotaoPrimario} ${icone ? "min-w-[212px]" : ""}`}
    >
      {icone && <IconeMais className="h-[18px] w-[18px]" />}
      {children}
    </button>
  );
}
