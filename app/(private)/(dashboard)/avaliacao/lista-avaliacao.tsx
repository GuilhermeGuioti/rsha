"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CabecalhoAdmin } from "../../../../components/CabecalhoAdmin";
import { CampoBusca } from "../../../../components/CampoBusca";
import { AbasFiltro } from "../../../../components/AbasFiltro";
import { SituacaoPill } from "../../../../components/SituacaoPill";
import { SeletorFiltro } from "../../../../components/SeletorFiltro";
import { AvisoVazio } from "../../../../components/AvisoVazio";
import { CabecalhoGrade, CartaoGrade, LinhaGrade } from "../../../../components/Grade";
import { Horas } from "../../../../components/Horas";
import { LinkAcao } from "../../../../components/LinkAcao";
import { classeBotaoPrimario } from "../../../../components/BotaoPrimario";
import { formatarData } from "../../../../lib/formato";
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

const COLUNAS = "grid-cols-[2fr_1.1fr_.8fr_1fr_100px]";

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
        <SeletorFiltro
          id="filtro-periodo-avaliacao"
          rotuloAcessivel="Filtrar por período letivo"
          valor={periodoId}
          onChange={(valor) => setPeriodoId(Number(valor))}
          opcoes={periodos.map((periodo) => ({ valor: periodo.id, rotulo: periodo.rotulo }))}
        />
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
        // Um cartão por curso.
        <div className="flex flex-col gap-5">
          {grupos.map((grupo) => (
            <CartaoGrade
              key={grupo.cursoNome}
              titulo={grupo.cursoNome}
              detalhe={`${grupo.itens.length} ${grupo.itens.length === 1 ? "relatório" : "relatórios"} · ${
                grupo.totalDocentesNoCurso
              } ${grupo.totalDocentesNoCurso === 1 ? "docente" : "docentes"} no curso`}
              classeLargura="min-w-[640px]"
            >
              <CabecalhoGrade className={COLUNAS}>
                <span>Docente</span>
                <span>Estado</span>
                <span className="text-right">Horas</span>
                <span>{aba === "AGUARDANDO_AVALIACAO" ? "Esperando" : aba === "DEVOLVIDO_PARA_AJUSTE" ? "Situação" : "Aprovado em"}</span>
                <span />
              </CabecalhoGrade>
              {grupo.itens.map((item) => {
                const dias = diasDesde(item.desde);
                return (
                  <LinhaGrade key={item.id} className={COLUNAS}>
                    <span className="text-[15px] font-medium">{item.docenteNome}</span>
                    <SituacaoPill situacao={item.situacao} />
                    <Horas valor={item.horas} />
                    {aba === "AGUARDANDO_AVALIACAO" && (
                      <span className={`font-mono text-[15px] font-medium ${corUrgencia(dias)}`}>
                        {dias <= 0 ? "hoje" : dias === 1 ? "1 dia" : `${dias} dias`}
                      </span>
                    )}
                    {aba === "DEVOLVIDO_PARA_AJUSTE" && <span className="text-[13px] text-tinta-suave">Com o docente</span>}
                    {aba === "APROVADO" && (
                      <span className="font-mono text-[13px] text-tinta-suave">{formatarData(item.desde)}</span>
                    )}
                    {/* O que espera avaliação é o trabalho da tela: ganha o
                        botão cheio; o resto só se consulta. */}
                    {aba === "AGUARDANDO_AVALIACAO" ? (
                      <Link href={`/avaliacao/${item.id}`} className={`${classeBotaoPrimario} justify-self-end`}>
                        Avaliar
                      </Link>
                    ) : (
                      <LinkAcao href={`/avaliacao/${item.id}`} className="justify-self-end">
                        Ver
                      </LinkAcao>
                    )}
                  </LinhaGrade>
                );
              })}
            </CartaoGrade>
          ))}
        </div>
      )}
    </div>
  );
}
