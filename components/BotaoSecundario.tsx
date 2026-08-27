import type { ReactNode } from "react";

export function BotaoSecundario({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-11 items-center rounded-md border border-[#92cde9] bg-superficie px-4 text-[15px] font-medium text-azul-interativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}
