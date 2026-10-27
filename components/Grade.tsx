import type { ReactNode } from "react";
import { Cartao } from "./Cartao";
import { classeTituloSecao } from "./CabecalhoAdmin";

// Lista em grade (não <table>) dentro de um cartão: um curso da fila de
// avaliação, uma pasta do arquivo. As colunas vêm de quem usa, como classe
// grid-cols-[…] literal; `classeLargura` (min-w-[…]) faz a grade rolar na
// horizontal em 360px em vez de cortar a última coluna. O título e o `rodape`
// ficam fora da rolagem, para quebrarem linha normalmente.
export function CartaoGrade({
  titulo,
  detalhe,
  classeLargura,
  rodape,
  children,
}: {
  titulo: ReactNode;
  detalhe?: ReactNode;
  classeLargura: string;
  rodape?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Cartao como="section" className="overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-borda px-5 py-4">
        <h2 className={classeTituloSecao}>{titulo}</h2>
        {detalhe && <span className="text-[13px] text-tinta-suave">{detalhe}</span>}
      </div>
      <div className="overflow-x-auto">
        <div className={classeLargura}>{children}</div>
      </div>
      {rodape}
    </Cartao>
  );
}

export function CabecalhoGrade({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={`grid gap-4 border-b border-borda bg-superficie-sutil px-5 py-3 text-[13px] font-semibold text-tinta-suave ${className}`}
    >
      {children}
    </div>
  );
}

export function LinhaGrade({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={`grid items-center gap-4 border-b border-borda/70 px-5 py-2.5 transition-colors last:border-0 hover:bg-superficie-sutil ${className}`}
    >
      {children}
    </div>
  );
}
