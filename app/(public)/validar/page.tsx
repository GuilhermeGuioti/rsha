import type { Metadata } from "next";
import { CartaoPublico } from "../../../components/CartaoPublico";
import { FormularioValidacao } from "./formulario-validacao";

export const metadata: Metadata = {
  title: "Validar documento - SRHA",
};

// Pública, sem guard: ver acoes.ts.
export default function ValidarPage() {
  return (
    <main className="flex flex-1 flex-col items-center bg-papel px-4 py-10 sm:px-6 sm:py-14">
      <CartaoPublico
        largo
        sobretitulo="SRHA · Autenticidade"
        titulo="Validar documento"
        descricao="Confira se um relatório de horas atividades foi emitido pelo SRHA. Anexe o PDF ou digite o código de autenticidade impresso no documento."
      >
        <FormularioValidacao />
      </CartaoPublico>
    </main>
  );
}
