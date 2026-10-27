import { TipoEvento } from "../generated/prisma/enums";
import { formatarDataHora, formatarHoras, ROTULO_EVENTO } from "../lib/formato";
import { Cartao } from "./Cartao";
import { classeTituloSecao } from "./CabecalhoAdmin";
import { Destaque } from "./Destaque";
import { IconeRelogio } from "./Icones";
import { Marcador, type Forma } from "./Pill";
import { SeloIcone } from "./SeloIcone";

export type EventoTrilha = {
  id: number;
  tipo: TipoEvento;
  ocorridoEm: Date;
  justificativa: string | null;
  usuario: { nome: string };
};

// Só o visual mora aqui; o rótulo vem de lib/formato para não divergir do PDF.
// `marcador` é o círculo em volta da forma; a cor dele (text-*) pinta a forma.
const APARENCIA_EVENTO: Record<TipoEvento, { cor: string; marcador: string; forma: Forma }> = {
  CRIACAO: {
    cor: "text-tinta",
    marcador: "border-borda bg-superficie text-estado-rascunho",
    forma: "circulo-vazado",
  },
  SUBMISSAO: {
    cor: "text-estado-aguardando",
    marcador: "border-estado-aguardando-borda bg-estado-aguardando-suave text-estado-aguardando",
    forma: "quadrado",
  },
  DEVOLUCAO: {
    cor: "text-estado-devolvido",
    marcador: "border-estado-devolvido-borda bg-estado-devolvido-suave text-estado-devolvido",
    forma: "triangulo",
  },
  APROVACAO: {
    cor: "text-estado-aprovado",
    marcador: "border-estado-aprovado-borda bg-estado-aprovado-suave text-estado-aprovado",
    forma: "circulo",
  },
};

// Coluna permanente ao lado do relatório, nunca escondida atrás de aba ou
// modal (ver CLAUDE.md § Interface). Compartilhada entre a tela do docente e
// a tela de avaliação — é a mesma trilha, lida por gente diferente.
export function TrilhaAuditoria({
  eventos,
  cargaHorariaTotal,
}: {
  eventos: EventoTrilha[];
  cargaHorariaTotal: number;
}) {
  const totalDevolucoes = eventos.filter((evento) => evento.tipo === TipoEvento.DEVOLUCAO).length;

  return (
    <Cartao como="aside" className="p-6">
      <div className="flex items-center gap-3">
        <SeloIcone>
          <IconeRelogio className="h-[22px] w-[22px]" />
        </SeloIcone>
        <h2 className={classeTituloSecao}>Trilha do documento</h2>
      </div>
      <p className="mt-3 mb-6 text-[13px] leading-relaxed text-tinta-suave">
        Tudo o que aconteceu com este relatório, com autor e horário.
      </p>
      <ol className="flex flex-col">
        {eventos.map((evento, indice) => {
          const aparencia = APARENCIA_EVENTO[evento.tipo];
          return (
            <li key={evento.id} className="grid grid-cols-[28px_1fr] gap-3.5">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border ${aparencia.marcador}`}
                >
                  <Marcador forma={aparencia.forma} />
                </span>
                {indice < eventos.length - 1 && <span aria-hidden className="my-1 w-px flex-1 bg-borda" />}
              </div>
              <div className="pt-0.5 pb-6">
                <div className={`text-[15px] font-semibold ${aparencia.cor}`}>{ROTULO_EVENTO[evento.tipo]}</div>
                <div className="mt-1 text-[13px] leading-relaxed text-tinta-suave">
                  {evento.usuario.nome} · <span className="font-mono font-medium">{formatarDataHora(evento.ocorridoEm)}</span>
                </div>
                {evento.justificativa && (
                  <Destaque como="p" tom="devolvido" compacto className="mt-2.5 text-[13px] leading-relaxed">
                    <q>{evento.justificativa}</q>
                  </Destaque>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="border-t border-borda pt-4 text-[13px] leading-relaxed text-tinta-suave">
        Total declarado:{" "}
        <span className="font-mono font-semibold tabular-nums text-tinta">{formatarHoras(cargaHorariaTotal)} h</span>
        {totalDevolucoes > 0 && (
          <>
            {" · devolvido "}
            <span className="font-mono font-semibold text-tinta">{totalDevolucoes}</span>
            {totalDevolucoes === 1 ? " vez" : " vezes"} neste semestre.
          </>
        )}
      </p>
    </Cartao>
  );
}
