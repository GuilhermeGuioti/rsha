import { TipoEvento } from "../generated/prisma/enums";
import { formatarDataHora, formatarHoras } from "../lib/formato";

type Evento = {
  id: number;
  tipo: TipoEvento;
  ocorridoEm: Date;
  justificativa: string | null;
  usuario: { nome: string };
};

const APARENCIA_EVENTO: Record<TipoEvento, { rotulo: string; cor: string; forma: string }> = {
  CRIACAO: { rotulo: "Relatório criado", cor: "text-tinta", forma: "h-2.5 w-2.5 rounded-full border-2 border-borda" },
  SUBMISSAO: {
    rotulo: "Enviado para avaliação",
    cor: "text-estado-aguardando",
    forma: "h-2.5 w-2.5 bg-estado-aguardando",
  },
  DEVOLUCAO: {
    rotulo: "Devolvido para ajuste",
    cor: "text-estado-devolvido",
    forma: "h-2.5 w-3 bg-estado-devolvido [clip-path:polygon(50%_0,100%_100%,0_100%)]",
  },
  APROVACAO: {
    rotulo: "Aprovado",
    cor: "text-estado-aprovado",
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
    <aside className="rounded-md border border-borda bg-superficie p-5">
      <h2 className="font-serif text-lg font-semibold text-azul-interativo">Trilha do documento</h2>
      <p className="mt-1 mb-5 text-[13px] leading-relaxed text-tinta-suave">
        Tudo o que aconteceu com este relatório, com autor e horário.
      </p>
      <ol className="flex flex-col">
        {eventos.map((evento, indice) => {
          const aparencia = APARENCIA_EVENTO[evento.tipo];
          return (
            <li key={evento.id} className="grid grid-cols-[22px_1fr] gap-3.5">
              <div className="flex flex-col items-center">
                <span aria-hidden className={`mt-1.5 flex-none ${aparencia.forma}`} />
                {indice < eventos.length - 1 && <span aria-hidden className="mt-1.5 w-px flex-1 bg-borda" />}
              </div>
              <div className="pb-5">
                <div className={`text-[15px] font-medium ${aparencia.cor}`}>{aparencia.rotulo}</div>
                <div className="mt-1 text-[13px] leading-relaxed text-tinta-suave">
                  {evento.usuario.nome} · <span className="font-mono font-medium">{formatarDataHora(evento.ocorridoEm)}</span>
                </div>
                {evento.justificativa && (
                  <p className="mt-2 rounded-sm border-l-2 border-[#e9c3c0] bg-papel px-3 py-2.5 text-[13px] leading-relaxed">
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
        <span className="font-mono font-medium tabular-nums text-tinta">{formatarHoras(cargaHorariaTotal)} h</span>
        {totalDevolucoes > 0 && (
          <>
            {" · devolvido "}
            <span className="font-mono font-medium text-tinta">{totalDevolucoes}</span>
            {totalDevolucoes === 1 ? " vez" : " vezes"} neste semestre.
          </>
        )}
      </p>
    </aside>
  );
}
