"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CabecalhoAdmin } from "../../../../components/CabecalhoAdmin";
import { SituacaoPill } from "../../../../components/SituacaoPill";
import { formatarHoras } from "../../../../lib/formato";
import type { SituacaoRelatorio } from "../../../../generated/prisma/client";

export type ItemFila = {
  id: number;
  docenteNome: string;
  cursoId: number;
  cursoNome: string;
  situacao: SituacaoRelatorio;
  horas: number;
  desde: Date;
  totalDocentesNoCurso: number;
};

type Aba = "AGUARDANDO_AVALIACAO" | "DEVOLVIDO_PARA_AJUSTE" | "APROVADO";

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: "AGUARDANDO_AVALIACAO", rotulo: "Aguardando" },
  { valor: "DEVOLVIDO_PARA_AJUSTE", rotulo: "Devolvidos" },
  { valor: "APROVADO", rotulo: "Aprovados" },
];

function diasDesde(data: Date): number {
  return Math.floor((Date.now() - data.getTime()) / 86_400_000);
}

// Mesma leitura da fila e do formulário: cor nunca é o único portador de
// estado, sempre acompanhada do texto por extenso (ver CLAUDE.md § Interface).
function corUrgencia(dias: number): string {
  if (dias >= 7) return "text-estado-devolvido";
  if (dias >= 3) return "text-estado-aguardando";
  return "text-tinta-suave";
}

export function ListaAvaliacao({ itens, periodoRotulo }: { itens: ItemFila[]; periodoRotulo: string }) {
  const [aba, setAba] = useState<Aba>("AGUARDANDO_AVALIACAO");

  const contagens = useMemo(
    () => ({
      AGUARDANDO_AVALIACAO: itens.filter((item) => item.situacao === "AGUARDANDO_AVALIACAO").length,
      DEVOLVIDO_PARA_AJUSTE: itens.filter((item) => item.situacao === "DEVOLVIDO_PARA_AJUSTE").length,
      APROVADO: itens.filter((item) => item.situacao === "APROVADO").length,
    }),
    [itens],
  );

  const grupos = useMemo(() => {
    const visiveis = itens.filter((item) => item.situacao === aba);
    const porCurso = new Map<number, { cursoNome: string; totalDocentesNoCurso: number; itens: ItemFila[] }>();
    for (const item of visiveis) {
      const grupo = porCurso.get(item.cursoId);
      if (grupo) {
        grupo.itens.push(item);
      } else {
        porCurso.set(item.cursoId, {
          cursoNome: item.cursoNome,
          totalDocentesNoCurso: item.totalDocentesNoCurso,
          itens: [item],
        });
      }
    }
    return [...porCurso.values()].sort((a, b) => a.cursoNome.localeCompare(b.cursoNome, "pt-BR"));
  }, [itens, aba]);

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoAdmin
        titulo="Fila de avaliação"
        subtitulo={
          <p className="text-[15px] text-tinta-suave">
            <span className="font-mono font-medium text-tinta">{contagens.AGUARDANDO_AVALIACAO}</span>{" "}
            {contagens.AGUARDANDO_AVALIACAO === 1 ? "relatório aguardando" : "relatórios aguardando"} você ·{" "}
            {periodoRotulo}
          </p>
        }
        acao={
          <div className="flex gap-2">
            {ABAS.map((item) => (
              <button
                key={item.valor}
                type="button"
                onClick={() => setAba(item.valor)}
                className={`flex min-h-10 items-center rounded-md px-3.5 text-[13px] ${
                  aba === item.valor
                    ? "bg-azul-institucional font-medium text-white"
                    : "border border-borda bg-superficie text-tinta-suave"
                }`}
              >
                {item.rotulo} ({contagens[item.valor]})
              </button>
            ))}
          </div>
        }
      />

      {grupos.length === 0 ? (
        <p className="rounded-md border border-borda bg-superficie px-5 py-8 text-center text-[15px] text-tinta-suave">
          Nenhum relatório {ABAS.find((item) => item.valor === aba)!.rotulo.toLowerCase()} no momento.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-borda bg-superficie">
          {grupos.map((grupo) => (
            <div key={grupo.cursoNome}>
              <div className="flex items-baseline gap-2.5 border-b border-[#b7dff3] bg-[#e9f6fc] px-5 py-3">
                <span className="font-serif text-[15px] font-semibold text-azul-interativo">{grupo.cursoNome}</span>
                <span className="text-[13px] text-tinta-suave">
                  {grupo.itens.length} {grupo.itens.length === 1 ? "relatório" : "relatórios"} ·{" "}
                  {grupo.totalDocentesNoCurso} {grupo.totalDocentesNoCurso === 1 ? "docente" : "docentes"} no curso
                </span>
              </div>
              <div className="grid grid-cols-[2fr_1.1fr_.8fr_1fr_100px] gap-4 border-b border-borda px-5 py-2.5 text-[13px] font-medium text-tinta-suave">
                <span>Docente</span>
                <span>Estado</span>
                <span className="text-right">Horas</span>
                <span>{aba === "AGUARDANDO_AVALIACAO" ? "Esperando" : aba === "DEVOLVIDO_PARA_AJUSTE" ? "Situação" : "Aprovado em"}</span>
                <span />
              </div>
              {grupo.itens.map((item, indice) => {
                const dias = diasDesde(item.desde);
                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[2fr_1.1fr_.8fr_1fr_100px] items-center gap-4 px-5 py-3.5 ${
                      indice < grupo.itens.length - 1 ? "border-b border-borda" : ""
                    }`}
                  >
                    <span className="text-[15px]">{item.docenteNome}</span>
                    <SituacaoPill situacao={item.situacao} />
                    <span className="text-right font-mono text-[15px] font-medium tabular-nums">
                      {formatarHoras(item.horas)}
                    </span>
                    {aba === "AGUARDANDO_AVALIACAO" && (
                      <span className={`font-mono text-[15px] font-medium ${corUrgencia(dias)}`}>
                        {dias <= 0 ? "hoje" : dias === 1 ? "1 dia" : `${dias} dias`}
                      </span>
                    )}
                    {aba === "DEVOLVIDO_PARA_AJUSTE" && <span className="text-[13px] text-tinta-suave">Com o docente</span>}
                    {aba === "APROVADO" && (
                      <span className="font-mono text-[13px] text-tinta-suave">
                        {item.desde.toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    <Link
                      href={`/avaliacao/${item.id}`}
                      className={`text-right text-[15px] text-azul-interativo hover:underline ${
                        aba === "AGUARDANDO_AVALIACAO" ? "font-medium" : "font-normal"
                      }`}
                    >
                      {aba === "AGUARDANDO_AVALIACAO" ? "Avaliar" : "Ver"}
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
