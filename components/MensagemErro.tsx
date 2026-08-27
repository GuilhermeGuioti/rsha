import type { ReactNode } from "react";

export function MensagemErro({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-[15px] font-medium text-estado-devolvido">
      {children}
    </p>
  );
}
