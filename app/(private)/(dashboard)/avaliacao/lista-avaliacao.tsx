"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CabecalhoAdmin } from "../../../../components/CabecalhoAdmin";
import { CampoBusca } from "../../../../components/CampoBusca";
import { AbasFiltro } from "../../../../components/AbasFiltro";
import { SituacaoPill } from "../../../../components/SituacaoPill";
import { classeCampoSelect } from "../../../../components/Campo";
import { classeCartao } from "../../../../components/Cartao";
import { AvisoVazio } from "../../../../components/AvisoVazio";
import { formatarData, formatarHoras } from "../../../../lib/formato";
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
          className={`${classeCampoSelect} shadow-cartao`}
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
        <AvisoVazio>
          {busca.normalizado
            ? "Nenhum relatório encontrado."
            : `Nenhum relatório ${ABAS.find((item) => item.valor === aba)!.rotulo.toLowerCase()} nesse período.`}
        </AvisoVazio>
      ) : (
        // Um cartão por curso. Mesma saída da Tabela: em tela estreita a grade
        // rola na horizontal em vez de cortar a coluna "Avaliar" (CLAUDE.md §
        // Interface, 360px).
        <div className="flex flex-col gap-5">
          {grupos.map((grupo) => (
            <section key={grupo.cursoNome} className={`overflow-x-auto ${classeCartao}`}>
              <div className="min-w-[640px]">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-borda px-5 py-4">
                  <h2 className="text-[17px] font-bold tracking-tight text-tinta">{grupo.cursoNome}</h2>
                  <span className="text-[13px] text-tinta-suave">
                    {grupo.itens.length} {grupo.itens.length === 1 ? "relatório" : "relatórios"} ·{" "}
                    {grupo.totalDocentesNoCurso} {grupo.totalDocentesNoCurso === 1 ? "docente" : "docentes"} no curso
                  </span>
                </div>
                <div className="grid grid-cols-[2fr_1.1fr_.8fr_1fr_100px] gap-4 border-b border-borda bg-superficie-sutil px-5 py-3 text-[13px] font-semibold text-tinta-suave">
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
                      className={`grid grid-cols-[2fr_1.1fr_.8fr_1fr_100px] items-center gap-4 px-5 py-3 transition-colors hover:bg-superficie-sutil ${
                        indice < grupo.itens.length - 1 ? "border-b border-borda/70" : ""
                      }`}
                    >
                      <span className="text-[15px] font-medium">{item.docenteNome}</span>
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
                          {formatarData(item.desde)}
                        </span>
                      )}
                      <Link
                        href={`/avaliacao/${item.id}`}
                        className={`ml-auto inline-flex min-h-11 items-center justify-center rounded-lg px-3.5 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo ${
                          aba === "AGUARDANDO_AVALIACAO"
                            ? "bg-azul-interativo font-semibold text-white shadow-botao hover:bg-azul-escuro"
                            : "font-semibold text-azul-interativo hover:bg-azul-suave"
                        }`}
                      >
                        {aba === "AGUARDANDO_AVALIACAO" ? "Avaliar" : "Ver"}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
