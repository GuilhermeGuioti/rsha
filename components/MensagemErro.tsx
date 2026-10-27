import type { ReactNode } from "react";
import { Destaque } from "./Destaque";
import { Marcador } from "./Pill";

// Mesmo triângulo do "Devolvido para ajuste": o erro não depende só do
// vermelho para ser percebido.
export function MensagemErro({ children }: { children: ReactNode }) {
  return (
    <Destaque
      como="p"
      role="alert"
      tom="devolvido"
      compacto
      className="flex items-start gap-2.5 text-[15px] font-medium text-estado-devolvido"
    >
      <Marcador forma="triangulo" className="mt-[7px]" />
      <span>{children}</span>
    </Destaque>
  );
}
