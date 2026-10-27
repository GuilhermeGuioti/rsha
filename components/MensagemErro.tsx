import type { ReactNode } from "react";

// Mesmo triângulo do "Devolvido para ajuste": o erro não depende só do
// vermelho para ser percebido.
export function MensagemErro({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-estado-devolvido-borda bg-estado-devolvido-suave px-4 py-3 text-[15px] font-medium text-estado-devolvido"
    >
      <span aria-hidden className="mt-[7px] h-2.5 w-3 flex-none bg-current [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
      <span>{children}</span>
    </p>
  );
}
