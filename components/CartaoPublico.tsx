import type { ReactNode } from "react";
import { classeTituloTela } from "./CabecalhoAdmin";
import { MarcaInstitucional } from "./MarcaInstitucional";
import { Sobretitulo } from "./Sobretitulo";

// Bloco das telas públicas (/login, /validar): a marca no topo e o cartão
// flutuante com sobretítulo, título e descrição. No login a marca já está no
// painel lateral do desktop, então aqui ela aparece só abaixo do lg.
export function CartaoPublico({
  sobretitulo,
  titulo,
  descricao,
  largo,
  marcaSoNoCelular,
  children,
}: {
  sobretitulo: string;
  titulo: string;
  descricao: ReactNode;
  largo?: boolean;
  marcaSoNoCelular?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <div className={`mb-8 ${marcaSoNoCelular ? "lg:hidden" : ""}`}>
        <MarcaInstitucional />
      </div>
      <div
        className={`w-full ${largo ? "max-w-[640px]" : "max-w-[540px]"} rounded-3xl bg-superficie px-6 py-8 shadow-flutuante sm:px-10 sm:py-10`}
      >
        <Sobretitulo>{sobretitulo}</Sobretitulo>
        {/* Título curto, em uma linha só a partir do sm: o cartão estreito
            deixa 460px de conteúdo, e "Relatório de Horas Atividades" pede
            389px. */}
        <h1 className={`mt-3 sm:whitespace-nowrap ${classeTituloTela}`}>{titulo}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">{descricao}</p>
        {children}
      </div>
    </>
  );
}
