"use client";

import { useState } from "react";
import Link from "next/link";
import { CabecalhoAdmin } from "../../../../components/CabecalhoAdmin";
import { BotaoSecundario, classeBotaoSecundario } from "../../../../components/BotaoSecundario";
import { Modal } from "../../../../components/Modal";
import { Tabela, type ColunaTabela } from "../../../../components/Tabela";
import { classeCampoSelect } from "../../../../components/Campo";
import { formatarData, formatarHoras } from "../../../../lib/formato";

export type DocenteAcompanhamento = {
  docenteId: number;
  docenteNome: string;
  relatorioId: number | null;
  horas: number | null;
  atualizadoEm: Date | null;
  podeAvaliar: boolean;
};

export type LinhaAcompanhamento = {
  cursoId: number;
  cursoNome: string;
  naoIniciados: DocenteAcompanhamento[];
  rascunho: DocenteAcompanhamento[];
  aguardando: DocenteAcompanhamento[];
  devolvido: DocenteAcompanhamento[];
  aprovado: DocenteAcompanhamento[];
};

export type GrupoPeriodo = {
  periodoLetivoId: number;
  rotulo: string;
  prazo: Date;
  linhas: LinhaAcompanhamento[];
};

type ChaveSegmento = "naoIniciados" | "rascunho" | "aguardando" | "devolvido" | "aprovado";

// Fonte única da leitura de cada situação na coluna, na barra e na legenda —
// cor nunca é o único portador de estado (ver CLAUDE.md § Interface): cada
// segmento também tem coluna própria com número e rótulo por extenso.
const SEGMENTOS: { chave: ChaveSegmento; rotulo: string; corBarra: string; corTexto: string }[] = [
  { chave: "naoIniciados", rotulo: "Não iniciados", corBarra: "bg-[#edeff3]", corTexto: "text-tinta-suave" },
  { chave: "rascunho", rotulo: "Em elaboração", corBarra: "bg-estado-rascunho", corTexto: "text-estado-rascunho" },
  { chave: "aguardando", rotulo: "Aguardando", corBarra: "bg-estado-aguardando", corTexto: "text-estado-aguardando" },
  { chave: "devolvido", rotulo: "Devolvidos", corBarra: "bg-estado-devolvido", corTexto: "text-estado-devolvido" },
  { chave: "aprovado", rotulo: "Aprovados", corBarra: "bg-estado-aprovado", corTexto: "text-estado-aprovado" },
];

function totalDocentes(linha: LinhaAcompanhamento): number {
  return (
    linha.naoIniciados.length + linha.rascunho.length + linha.aguardando.length + linha.devolvido.length + linha.aprovado.length
  );
}

function BarraProporcao({ linha }: { linha: LinhaAcompanhamento }) {
  const total = totalDocentes(linha);
  return (
    <div
      role="img"
      aria-label={SEGMENTOS.map(
        (segmento) => `${linha[segmento.chave].length} ${segmento.rotulo.toLowerCase()}`,
      ).join(", ")}
      className="flex h-3 w-full max-w-[180px] overflow-hidden rounded-sm border border-borda"
    >
      {SEGMENTOS.map((segmento) => {
        const valor = linha[segmento.chave].length;
        if (valor === 0) return null;
        return (
          <span key={segmento.chave} className={segmento.corBarra} style={{ width: `${(valor / total) * 100}%` }} />
        );
      })}
    </div>
  );
}

type Selecao = { linha: LinhaAcompanhamento; segmento: (typeof SEGMENTOS)[number] };

export function PainelAcompanhamento({ grupos, podeExtrair }: { grupos: GrupoPeriodo[]; podeExtrair: boolean }) {
  // grupos já vem ordenado do mais recente pro mais antigo — esse é o
  // período corrente; os demais ficam a um clique de distância (mesmo
  // padrão do seletor de período da fila de avaliação).
  const [periodoLetivoId, setPeriodoLetivoId] = useState(grupos[0].periodoLetivoId);
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [copiado, setCopiado] = useState(false);

  const grupoAtual = grupos.find((grupo) => grupo.periodoLetivoId === periodoLetivoId) ?? grupos[0];
  const { linhas, rotulo: periodoRotulo, prazo } = grupoAtual;

  function mudarPeriodo(novoPeriodoLetivoId: number) {
    setPeriodoLetivoId(novoPeriodoLetivoId);
    setSelecao(null);
  }

  function abrirModal(linha: LinhaAcompanhamento, segmento: (typeof SEGMENTOS)[number]) {
    setSelecao({ linha, segmento });
    setCopiado(false);
  }

  const docentesSelecionados = selecao ? selecao.linha[selecao.segmento.chave] : [];
  const mostrarRelatorio = selecao?.segmento.chave !== "naoIniciados";

  async function copiarLista() {
    if (!selecao) return;
    const texto = docentesSelecionados.map((docente) => `${docente.docenteNome} · ${selecao.linha.cursoNome}`).join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      // Sem permissão de clipboard no navegador — a lista continua legível
      // e selecionável na tela, só o atalho de copiar não funciona.
    }
  }

  const colunas: ColunaTabela<DocenteAcompanhamento>[] = [
    { cabecalho: "Docente", render: (docente) => docente.docenteNome },
    ...(mostrarRelatorio
      ? ([
          {
            cabecalho: "Horas",
            alinhado: "direita" as const,
            render: (docente: DocenteAcompanhamento) => (
              <span className="font-mono tabular-nums">
                {docente.horas !== null ? formatarHoras(docente.horas) : "—"}
              </span>
            ),
          },
          {
            cabecalho: "",
            render: (docente: DocenteAcompanhamento) =>
              docente.relatorioId ? (
                <Link
                  href={docente.podeAvaliar ? `/avaliacao/${docente.relatorioId}` : `/relatorios/${docente.relatorioId}`}
                  className="inline-flex min-h-11 items-center text-azul-interativo hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
                >
                  Abrir
                </Link>
              ) : null,
          },
        ] satisfies ColunaTabela<DocenteAcompanhamento>[])
      : []),
  ];

  const colunasTabela: ColunaTabela<LinhaAcompanhamento>[] = [
    {
      cabecalho: "Curso",
      render: (linha) => <span className="font-serif text-[15px] font-semibold">{linha.cursoNome}</span>,
    },
    ...SEGMENTOS.map((segmento) => ({
      cabecalho: segmento.rotulo,
      render: (linha: LinhaAcompanhamento) => (
        <button
          type="button"
          onClick={() => abrirModal(linha, segmento)}
          className={`inline-flex min-h-11 items-center font-mono text-lg font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo ${segmento.corTexto}`}
        >
          {linha[segmento.chave].length}
        </button>
      ),
    })),
    { cabecalho: "Proporção", render: (linha) => <BarraProporcao linha={linha} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoAdmin
        titulo="Acompanhamento do período"
        subtitulo={
          <p className="text-[15px] text-tinta-suave">
            {periodoRotulo} · prazo em{" "}
            <span className="font-mono font-medium text-tinta">{formatarData(prazo)}</span>
          </p>
        }
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="filtro-periodo-acompanhamento" className="sr-only">
              Filtrar por período letivo
            </label>
            <select
              id="filtro-periodo-acompanhamento"
              value={periodoLetivoId}
              onChange={(evento) => mudarPeriodo(Number(evento.target.value))}
              className={`${classeCampoSelect} min-h-10`}
            >
              {grupos.map((grupo) => (
                <option key={grupo.periodoLetivoId} value={grupo.periodoLetivoId}>
                  {grupo.rotulo}
                </option>
              ))}
            </select>
            {/* Extração é da secretaria (RF21); a rota confere o perfil de novo. */}
            {podeExtrair && (
              <a href={`/api/periodos/${periodoLetivoId}/csv`} className={classeBotaoSecundario}>
                Extrair planilha
                <span className="sr-only"> do {periodoRotulo} (CSV)</span>
              </a>
            )}
          </div>
        }
      />

      <Tabela
        colunas={colunasTabela}
        linhas={linhas}
        chave={(linha) => linha.cursoId}
        minWidthPx={860}
        vazio="Nenhum curso neste período."
      />

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-tinta-suave">
        {SEGMENTOS.map((segmento) => (
          <span key={segmento.chave} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-2.5 w-2.5 flex-none border border-borda ${segmento.corBarra}`} />
            {segmento.rotulo}
          </span>
        ))}
      </div>

      <Modal
        aberto={selecao !== null}
        eyebrow={selecao ? `ACOMPANHAMENTO · ${selecao.linha.cursoNome.toUpperCase()}` : ""}
        titulo={selecao?.segmento.rotulo ?? ""}
        descricao={`${docentesSelecionados.length} ${docentesSelecionados.length === 1 ? "docente" : "docentes"}`}
        onFechar={() => setSelecao(null)}
        rodape={
          <>
            <BotaoSecundario onClick={() => setSelecao(null)}>Fechar</BotaoSecundario>
            <BotaoSecundario onClick={copiarLista} disabled={docentesSelecionados.length === 0}>
              {copiado ? "Copiado!" : "Copiar lista"}
            </BotaoSecundario>
          </>
        }
      >
        <div className="max-h-[50vh] overflow-y-auto">
          <Tabela
            colunas={colunas}
            linhas={docentesSelecionados}
            chave={(docente) => docente.docenteId}
            minWidthPx={mostrarRelatorio ? 380 : 200}
            vazio="Ninguém nesta situação."
          />
        </div>
      </Modal>
    </div>
  );
}
