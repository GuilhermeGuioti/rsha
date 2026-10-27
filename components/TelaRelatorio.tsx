import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { Cartao } from "./Cartao";
import { classeTituloTela } from "./CabecalhoAdmin";
import { RotuloCodigo } from "./RotuloCodigo";
import { TrilhaAuditoria, type EventoTrilha } from "./TrilhaAuditoria";

export type PassoCaminho = { rotulo: string; href?: string };

// Esqueleto comum da tela do relatório (docente) e da avaliação
// (coordenação): o caminho até ali, o cartão do documento com cabeçalho e
// situação e, ao lado, a trilha de auditoria — coluna permanente, nunca
// escondida atrás de aba (CLAUDE.md § Interface). No celular a trilha desce
// para baixo do relatório. `depois` entra na coluna principal, abaixo do
// cartão (o painel de decisão da avaliação).
export function TelaRelatorio({
  caminho,
  codigo,
  titulo,
  subtitulo,
  situacao,
  eventos,
  cargaHorariaTotal,
  depois,
  children,
}: {
  caminho: PassoCaminho[];
  codigo: string;
  titulo: string;
  subtitulo: ReactNode;
  situacao: ReactNode;
  eventos: EventoTrilha[];
  cargaHorariaTotal: number;
  depois?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Você está em" className="flex flex-wrap items-center gap-2 text-[13px] text-tinta-suave">
        {caminho.map((passo, indice) => (
          <Fragment key={indice}>
            {indice > 0 && <span aria-hidden>›</span>}
            {passo.href ? (
              <Link href={passo.href} className="font-semibold text-azul-interativo hover:underline">
                {passo.rotulo}
              </Link>
            ) : (
              <span>{passo.rotulo}</span>
            )}
          </Fragment>
        ))}
      </nav>

      {/* grid-cols-1 e não o auto implícito: sem ele, no celular a coluna
          cresce até o <option> mais largo e a tela rola de lado. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5">
          <Cartao className="flex flex-col gap-6 p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-borda pb-6">
              <div>
                <RotuloCodigo>{codigo}</RotuloCodigo>
                <h1 className={`mt-2 ${classeTituloTela}`}>{titulo}</h1>
                <p className="mt-1.5 text-[15px] text-tinta-suave">{subtitulo}</p>
              </div>
              <div className="flex flex-col items-start gap-2.5 sm:items-end">{situacao}</div>
            </div>
            {children}
          </Cartao>
          {depois}
        </div>

        <TrilhaAuditoria eventos={eventos} cargaHorariaTotal={cargaHorariaTotal} />
      </div>
    </div>
  );
}
