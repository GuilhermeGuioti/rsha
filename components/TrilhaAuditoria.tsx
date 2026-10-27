import { TipoEvento } from "../generated/prisma/enums";
import { formatarDataHora, formatarHoras, ROTULO_EVENTO } from "../lib/formato";
import { classeCartao } from "./Cartao";
import { IconeRelogio } from "./Icones";

type Evento = {
  id: number;
  tipo: TipoEvento;
  ocorridoEm: Date;
  justificativa: string | null;
  usuario: { nome: string };
};

// Só o visual mora aqui; o rótulo vem de lib/formato para não divergir do PDF.
const APARENCIA_EVENTO: Record<TipoEvento, { cor: string; marcador: string; forma: string }> = {
  CRIACAO: {
    cor: "text-tinta",
    marcador: "border-borda bg-superficie",
    forma: "h-2.5 w-2.5 rounded-full border-2 border-estado-rascunho",
  },
  SUBMISSAO: {
    cor: "text-estado-aguardando",
    marcador: "border-estado-aguardando-borda bg-estado-aguardando-suave",
    forma: "h-2.5 w-2.5 rounded-[2px] bg-estado-aguardando",
  },
  DEVOLUCAO: {
    cor: "text-estado-devolvido",
    marcador: "border-estado-devolvido-borda bg-estado-devolvido-suave",
    forma: "h-2.5 w-3 bg-estado-devolvido [clip-path:polygon(50%_0,100%_100%,0_100%)]",
  },
  APROVACAO: {
    cor: "text-estado-aprovado",
    marcador: "border-estado-aprovado-borda bg-estado-aprovado-suave",
    forma: "h-2.5 w-2.5 rounded-full bg-estado-aprovado",
  },
};

// Coluna permanente ao lado do relatório, nunca escondida atrás de aba ou
// modal (ver CLAUDE.md § Interface). Compartilhada entre a tela do docente e
// a tela de avaliação — é a mesma trilha, lida por gente diferente.
export function TrilhaAuditoria({
  eventos,
  cargaHorariaTotal,
}: {
  eventos: Evento[];
  cargaHorariaTotal: number;
}) {
  const totalDevolucoes = eventos.filter((evento) => evento.tipo === TipoEvento.DEVOLUCAO).length;

  return (
    <aside className={`p-6 ${classeCartao}`}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-azul-suave text-azul-interativo"
        >
          <IconeRelogio className="h-[22px] w-[22px]" />
        </span>
        <h2 className="text-lg font-bold tracking-tight">Trilha do documento</h2>
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
                  <span className={`flex-none ${aparencia.forma}`} />
                </span>
                {indice < eventos.length - 1 && <span aria-hidden className="my-1 w-px flex-1 bg-borda" />}
              </div>
              <div className="pt-0.5 pb-6">
                <div className={`text-[15px] font-semibold ${aparencia.cor}`}>{ROTULO_EVENTO[evento.tipo]}</div>
                <div className="mt-1 text-[13px] leading-relaxed text-tinta-suave">
                  {evento.usuario.nome} · <span className="font-mono font-medium">{formatarDataHora(evento.ocorridoEm)}</span>
                </div>
                {evento.justificativa && (
                  <p className="mt-2.5 rounded-xl border border-estado-devolvido-borda bg-estado-devolvido-suave px-3.5 py-3 text-[13px] leading-relaxed">
                    <q>{evento.justificativa}</q>
                  </p>
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
    </aside>
  );
}
