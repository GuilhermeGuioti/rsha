import type { ReactNode } from "react";
import { classeCartao } from "./Cartao";

// Títulos de tela e de seção. Exportados para os cabeçalhos que não são este
// componente (tela do relatório, cartão das telas públicas, cartões de lista).
export const classeTituloTela = "text-2xl font-extrabold tracking-tight text-tinta sm:text-[28px]";
export const classeTituloSecao = "text-lg font-bold tracking-tight text-tinta";

// Nível 1 é o cabeçalho da tela, em cartão próprio (como as páginas do App do
// Dono); nível 2 é título de seção, solto sobre o papel.
export function CabecalhoAdmin({
  titulo,
  subtitulo,
  nivel = 1,
  acao,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  nivel?: 1 | 2;
  acao?: ReactNode;
}) {
  if (nivel === 2) {
    return (
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className={classeTituloSecao}>{titulo}</h2>
          {subtitulo}
        </div>
        {acao && <div className="flex flex-wrap items-center gap-2">{acao}</div>}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-5 py-5 sm:px-7 sm:py-6 ${classeCartao}`}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className={classeTituloTela}>{titulo}</h1>
        {subtitulo}
      </div>
      {acao && <div className="flex flex-wrap items-center gap-2">{acao}</div>}
    </div>
  );
}
