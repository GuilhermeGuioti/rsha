import type { ReactNode } from "react";
import { classeCartao } from "./Cartao";

// Estado vazio de tela inteira (sem período, sem vínculo, fila vazia): no
// mesmo cartão do resto do conteúdo, em vez de uma frase solta no papel.
export function AvisoVazio({ children }: { children: ReactNode }) {
  return (
    <div className={`px-6 py-12 text-center ${classeCartao}`}>
      <p className="mx-auto max-w-md text-[15px] leading-relaxed text-pretty text-tinta-suave">{children}</p>
    </div>
  );
}
