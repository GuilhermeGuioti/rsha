import type { ReactNode } from "react";

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
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        {nivel === 1 ? (
          <h1 className="font-serif text-2xl font-semibold text-azul-interativo">{titulo}</h1>
        ) : (
          <h2 className="font-serif text-lg font-semibold text-tinta">{titulo}</h2>
        )}
        {subtitulo}
      </div>
      {acao}
    </div>
  );
}
