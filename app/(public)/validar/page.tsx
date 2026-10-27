import type { Metadata } from "next";
import Image from "next/image";
import { FormularioValidacao } from "./formulario-validacao";

export const metadata: Metadata = {
  title: "Validar documento — SRHA",
};

// Pública, sem guard: ver acoes.ts.
export default function ValidarPage() {
  return (
    <main className="flex flex-1 flex-col items-center bg-papel px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-borda bg-superficie p-2 shadow-cartao">
          <Image src="/logo-barao.png" alt="" width={36} height={36} className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="text-[15px] font-bold leading-tight">Centro Universitário Barão de Mauá</p>
          <p className="mt-0.5 text-xs font-semibold tracking-[0.14em] text-tinta-suave uppercase">Horas Atividades</p>
        </div>
      </div>

      <div className="w-full max-w-[640px] rounded-3xl bg-superficie px-6 py-8 shadow-flutuante sm:px-10 sm:py-10">
        <p className="text-xs font-semibold tracking-[0.14em] text-azul-interativo uppercase">SRHA · Autenticidade</p>
        <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight">Validar documento</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
          Confira se um relatório de horas atividades foi emitido pelo SRHA. Anexe o PDF ou digite o código de
          autenticidade impresso no documento.
        </p>
        <FormularioValidacao />
      </div>
    </main>
  );
}
