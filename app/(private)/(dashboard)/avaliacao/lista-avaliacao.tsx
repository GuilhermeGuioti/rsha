"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CabecalhoAdmin } from "../../../../components/CabecalhoAdmin";
import { CampoBusca } from "../../../../components/CampoBusca";
import { AbasFiltro } from "../../../../components/AbasFiltro";
import { SituacaoPill } from "../../../../components/SituacaoPill";
import { classeCampoSelect } from "../../../../components/Campo";
import { formatarHoras } from "../../../../lib/formato";
import { useBusca } from "../../../../lib/hooks/useBusca";
import type { SituacaoRelatorio } from "../../../../generated/prisma/client";

export type ItemFila = {
  id: number;
  docenteNome: string;
  cursoId: number;
  cursoNome: string;
  periodoLetivoId: number;
  periodoRotulo: string;
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

export function ListaAvaliacao({
  itens,
  periodos,
}: {
  itens: ItemFila[];
  periodos: { id: number; rotulo: string }[];
}) {
  const [aba, setAba] = useState<Aba>("AGUARDANDO_AVALIACAO");
  // periodos já vem ordenado do mais recente pro mais antigo — esse é o
  // período de trabalho corrente; os demais ficam a um clique de distância.
  const [periodoId, setPeriodoId] = useState<number>(periodos[0].id);
  const busca = useBusca();

  const itensDoPeriodo = useMemo(
    () => itens.filter((item) => item.periodoLetivoId === periodoId),
    [itens, periodoId],
  );

  const contagens = useMemo(
    () => ({
      AGUARDANDO_AVALIACAO: itensDoPeriodo.filter((item) => item.situacao === "AGUARDANDO_AVALIACAO").length,
      DEVOLVIDO_PARA_AJUSTE: itensDoPeriodo.filter((item) => item.situacao === "DEVOLVIDO_PARA_AJUSTE").length,
      APROVADO: itensDoPeriodo.filter((item) => item.situacao === "APROVADO").length,
    }),
    [itensDoPeriodo],
  );

  const grupos = useMemo(() => {
    const visiveis = itensDoPeriodo.filter(
      (item) =>
        item.situacao === aba &&
        (item.docenteNome.toLowerCase().includes(busca.normalizado) ||
          item.cursoNome.toLowerCase().includes(busca.normalizado)),
    );
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
  }, [itensDoPeriodo, aba, busca.normalizado]);

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoAdmin
        titulo="Fila de avaliação"
        subtitulo={
          <p className="text-[15px] text-tinta-suave">
            <span className="font-mono font-medium text-tinta">{contagens.AGUARDANDO_AVALIACAO}</span>{" "}
            {contagens.AGUARDANDO_AVALIACAO === 1 ? "relatório aguardando" : "relatórios aguardando"} você
          </p>
        }
      />

      <div className="flex flex-wrap gap-2">
        <CampoBusca
          id="busca-avaliacao"
          rotuloAcessivel="Buscar por nome do docente ou do curso"
          placeholder="Buscar por docente ou curso…"
          valor={busca.valor}
          onChange={busca.definir}
        />
        <label htmlFor="filtro-periodo-avaliacao" className="sr-only">
          Filtrar por período letivo
        </label>
        <select
          id="filtro-periodo-avaliacao"
          value={periodoId}
          onChange={(evento) => setPeriodoId(Number(evento.target.value))}
          className={`${classeCampoSelect} min-h-10`}
        >
          {periodos.map((periodo) => (
            <option key={periodo.id} value={periodo.id}>
              {periodo.rotulo}
            </option>
          ))}
        </select>
        <AbasFiltro
          aba={aba}
          onMudar={setAba}
          opcoes={ABAS.map((item) => ({ ...item, contagem: contagens[item.valor] }))}
        />
      </div>

      {grupos.length === 0 ? (
        <p className="rounded-md border border-borda bg-superficie px-5 py-8 text-center text-[15px] text-tinta-suave">
          {busca.normalizado
            ? "Nenhum relatório encontrado."
            : `Nenhum relatório ${ABAS.find((item) => item.valor === aba)!.rotulo.toLowerCase()} nesse período.`}
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
