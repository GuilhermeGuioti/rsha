"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SituacaoRelatorio } from "../../../../generated/prisma/client";
import { CabecalhoAdmin } from "../../../../components/CabecalhoAdmin";
import { SituacaoPill } from "../../../../components/SituacaoPill";
import { Pill } from "../../../../components/Pill";
import { IconeChevron } from "../../../../components/Icones";
import { formatarHoras } from "../../../../lib/formato";

export type LinhaArquivo = {
  vinculoId: number;
  ano: number;
  semestre: number;
  periodoLetivoId: number;
  aberturaSubmissao: Date;
  encerramentoSubmissao: Date;
  cursoId: number;
  cursoNome: string;
  docenteId: number;
  docenteNome: string;
  relatorioId: number | null;
  situacao: SituacaoRelatorio | null;
  horas: number | null;
  aprovadoEm: Date | null;
  podeAvaliar: boolean;
};

type Selecao = { ano: number; semestre: number; cursoId: number };

function primeiraSelecao(linhas: LinhaArquivo[], ano?: number, semestre?: number): Selecao {
  const anoEscolhido = ano ?? Math.max(...linhas.map((linha) => linha.ano));
  const doAno = linhas.filter((linha) => linha.ano === anoEscolhido);
  const semestreEscolhido = semestre ?? Math.max(...doAno.map((linha) => linha.semestre));
  const doSemestre = doAno.filter((linha) => linha.semestre === semestreEscolhido);
  const cursoEscolhido = [...new Set(doSemestre.map((linha) => linha.cursoId))].sort((a, b) => {
    const nomeA = doSemestre.find((linha) => linha.cursoId === a)!.cursoNome;
    const nomeB = doSemestre.find((linha) => linha.cursoId === b)!.cursoNome;
    return nomeA.localeCompare(nomeB, "pt-BR");
  })[0];
  return { ano: anoEscolhido, semestre: semestreEscolhido, cursoId: cursoEscolhido };
}

type NoAno = { ano: number; semestres: NoSemestre[] };
type NoSemestre = { semestre: number; cursos: { cursoId: number; cursoNome: string }[] };

function chaveSemestre(ano: number, semestre: number): string {
  return `${ano}:${semestre}`;
}

export function ExploradorArquivo({ linhas }: { linhas: LinhaArquivo[] }) {
  const [selecao, setSelecao] = useState<Selecao>(() => primeiraSelecao(linhas));
  // Expandir/recolher é independente de selecionar — a árvore é navegável
  // como pasta (abre vários ramos ao mesmo tempo), mesmo que o filtro
  // aplicado no painel seja sempre um único ano/semestre/curso.
  const [anosAbertos, setAnosAbertos] = useState<Set<number>>(() => new Set([selecao.ano]));
  const [semestresAbertos, setSemestresAbertos] = useState<Set<string>>(
    () => new Set([chaveSemestre(selecao.ano, selecao.semestre)]),
  );
  const agora = useMemo(() => new Date(), []);

  const arvore = useMemo<NoAno[]>(() => {
    const porAno = new Map<number, Map<number, Map<number, string>>>();
    for (const linha of linhas) {
      const semestres = porAno.get(linha.ano) ?? new Map();
      porAno.set(linha.ano, semestres);
      const cursos = semestres.get(linha.semestre) ?? new Map();
      semestres.set(linha.semestre, cursos);
      cursos.set(linha.cursoId, linha.cursoNome);
    }
    return [...porAno.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([ano, semestresMap]) => ({
        ano,
        semestres: [...semestresMap.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([semestre, cursosMap]) => ({
            semestre,
            cursos: [...cursosMap.entries()]
              .map(([cursoId, cursoNome]) => ({ cursoId, cursoNome }))
              .sort((a, b) => a.cursoNome.localeCompare(b.cursoNome, "pt-BR")),
          })),
      }));
  }, [linhas]);

  const anoTemPeriodoAberto = (ano: number) =>
    linhas.some(
      (linha) => linha.ano === ano && agora >= linha.aberturaSubmissao && agora <= linha.encerramentoSubmissao,
    );

  const grupoAtual = useMemo(
    () =>
      linhas
        .filter(
          (linha) =>
            linha.ano === selecao.ano && linha.semestre === selecao.semestre && linha.cursoId === selecao.cursoId,
        )
        .sort((a, b) => a.docenteNome.localeCompare(b.docenteNome, "pt-BR")),
    [linhas, selecao],
  );

  const periodoAtual = grupoAtual[0];
  const totalEntregues = grupoAtual.filter((linha) => linha.relatorioId !== null).length;

  // Um clique só, na própria linha: fecha se já estava aberta, abre e
  // seleciona (filtra o painel) se estava fechada — igual clicar numa pasta.
  function alternarAno(ano: number) {
    const estavaAberto = anosAbertos.has(ano);
    setAnosAbertos((atual) => {
      const novo = new Set(atual);
      if (estavaAberto) {
        novo.delete(ano);
      } else {
        novo.add(ano);
      }
      return novo;
    });
    if (!estavaAberto) {
      const nova = primeiraSelecao(linhas, ano);
      setSelecao(nova);
      setSemestresAbertos((atual) => new Set(atual).add(chaveSemestre(ano, nova.semestre)));
    }
  }

  function alternarSemestre(ano: number, semestre: number) {
    const chave = chaveSemestre(ano, semestre);
    const estavaAberto = semestresAbertos.has(chave);
    setSemestresAbertos((atual) => {
      const novo = new Set(atual);
      if (estavaAberto) {
        novo.delete(chave);
      } else {
        novo.add(chave);
      }
      return novo;
    });
    if (!estavaAberto) {
      setSelecao(primeiraSelecao(linhas, ano, semestre));
    }
  }

  function selecionarCurso(ano: number, semestre: number, cursoId: number) {
    setSelecao({ ano, semestre, cursoId });
  }

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoAdmin
        titulo="Arquivo"
        subtitulo={
          <p className="text-[15px] text-tinta-suave">Ano › Semestre › Curso. Parece pasta, é filtro.</p>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
        <nav aria-label="Navegação do arquivo" className="overflow-hidden rounded-md border border-borda bg-superficie">
          <div className="border-b border-borda px-4 py-3 text-[13px] font-medium text-tinta-suave">Períodos</div>
          {arvore.map((noAno) => {
            const anoAberto = anosAbertos.has(noAno.ano);
            return (
              <div key={noAno.ano} className="border-t border-[#f0f3f6] first:border-t-0">
                <button
                  type="button"
                  onClick={() => alternarAno(noAno.ano)}
                  aria-expanded={anoAberto}
                  className={`flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-left text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azul-interativo ${
                    noAno.ano === selecao.ano ? "bg-[#e9f6fc] font-medium text-azul-interativo" : "text-tinta-suave"
                  }`}
                >
                  <IconeChevron
                    className={`h-3.5 w-3.5 flex-none transition-transform ${anoAberto ? "rotate-90" : ""}`}
                  />
                  {noAno.ano}
                  {anoTemPeriodoAberto(noAno.ano) && (
                    <span className="text-[13px] font-normal text-tinta-suave">· em andamento</span>
                  )}
                </button>
                {anoAberto &&
                  noAno.semestres.map((noSemestre) => {
                    const chave = chaveSemestre(noAno.ano, noSemestre.semestre);
                    const semestreAberto = semestresAbertos.has(chave);
                    const semestreSelecionado =
                      noAno.ano === selecao.ano && noSemestre.semestre === selecao.semestre;
                    return (
                      <div key={chave}>
                        <button
                          type="button"
                          onClick={() => alternarSemestre(noAno.ano, noSemestre.semestre)}
                          aria-expanded={semestreAberto}
                          className={`flex min-h-11 w-full items-center gap-2 border-t border-[#f0f3f6] py-2.5 pl-8 pr-4 text-left text-[15px] text-tinta-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azul-interativo ${
                            semestreSelecionado ? "bg-superficie font-medium text-tinta" : ""
                          }`}
                        >
                          <IconeChevron
                            className={`h-3 w-3 flex-none transition-transform ${semestreAberto ? "rotate-90" : ""}`}
                          />
                          {noSemestre.semestre}º semestre
                        </button>
                        {semestreAberto &&
                          noSemestre.cursos.map((curso) => {
                            const cursoSelecionado = semestreSelecionado && curso.cursoId === selecao.cursoId;
                            return (
                              <button
                                key={curso.cursoId}
                                type="button"
                                onClick={() => selecionarCurso(noAno.ano, noSemestre.semestre, curso.cursoId)}
                                className={`flex min-h-11 w-full items-center border-t border-[#f0f3f6] py-2.5 pl-12 pr-4 text-left text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azul-interativo ${
                                  cursoSelecionado ? "bg-[#e9f6fc] font-medium text-azul-interativo" : "text-tinta-suave"
                                }`}
                              >
                                {curso.cursoNome}
                              </button>
                            );
                          })}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        <div className="overflow-hidden rounded-md border border-borda bg-superficie">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-borda px-5 py-4">
            <span className="font-serif text-lg font-semibold text-azul-interativo">
              {periodoAtual?.cursoNome} · {selecao.ano}/{selecao.semestre}
            </span>
            {periodoAtual && (
              <span className="text-[13px] text-tinta-suave">
                {totalEntregues} de {grupoAtual.length} {grupoAtual.length === 1 ? "docente entregou" : "docentes entregaram"}
                {" · "}
                {agora > periodoAtual.encerramentoSubmissao ? (
                  <>
                    período encerrado em{" "}
                    <span className="font-mono font-medium">
                      {periodoAtual.encerramentoSubmissao.toLocaleDateString("pt-BR")}
                    </span>
                  </>
                ) : (
                  "período em andamento"
                )}
              </span>
            )}
          </div>

          <div className="grid grid-cols-[2fr_1.2fr_.7fr_1fr_90px] gap-4 border-b border-borda px-5 py-2.5 text-[13px] font-medium text-tinta-suave">
            <span>Docente</span>
            <span>Estado final</span>
            <span className="text-right">Horas</span>
            <span>Aprovado em</span>
            <span />
          </div>

          {grupoAtual.length === 0 ? (
            <p className="px-5 py-8 text-center text-[15px] text-tinta-suave">Nenhum docente vinculado a este curso neste período.</p>
          ) : (
            grupoAtual.map((linha, indice) => (
              <div
                key={linha.vinculoId}
                className={`grid grid-cols-[2fr_1.2fr_.7fr_1fr_90px] items-center gap-4 px-5 py-3.5 ${
                  indice < grupoAtual.length - 1 ? "border-b border-borda" : ""
                }`}
              >
                <span className="text-[15px]">{linha.docenteNome}</span>
                {linha.situacao ? (
                  <SituacaoPill situacao={linha.situacao} />
                ) : (
                  <Pill cor="neutro" forma="circulo-vazado">
                    Não entregue
                  </Pill>
                )}
                <span className="text-right font-mono text-[15px] font-medium tabular-nums">
                  {linha.horas !== null ? formatarHoras(linha.horas) : "—"}
                </span>
                <span className="font-mono text-[13px] text-tinta-suave">
                  {linha.aprovadoEm ? linha.aprovadoEm.toLocaleDateString("pt-BR") : "—"}
                </span>
                {linha.relatorioId ? (
                  <Link
                    href={linha.podeAvaliar ? `/avaliacao/${linha.relatorioId}` : `/relatorios/${linha.relatorioId}`}
                    className="text-right text-[15px] text-azul-interativo hover:underline"
                  >
                    Abrir
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
