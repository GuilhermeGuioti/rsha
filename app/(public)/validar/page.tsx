import type { Metadata } from "next";
import { FormularioValidacao } from "./formulario-validacao";

export const metadata: Metadata = {
  title: "Validar documento — SRHA",
};

// Pública, sem guard: ver acoes.ts.
export default function ValidarPage() {
  return (
    <main className="flex flex-1 items-start justify-center bg-papel px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-[640px] rounded-[10px] border border-borda bg-superficie px-6 py-8 shadow-sm sm:px-10 sm:py-10">
        <p className="font-mono text-xs font-medium tracking-[0.16em] text-tinta-suave">SRHA · AUTENTICIDADE</p>
        <h1 className="mt-4 font-serif text-[28px] font-semibold leading-tight text-azul-interativo">
          Validar documento
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
          Confira se um relatório de horas atividades foi emitido pelo SRHA. Anexe o PDF ou digite o código de
          autenticidade impresso no documento.
        </p>
        <FormularioValidacao />
      </div>
    </main>
  );
}
