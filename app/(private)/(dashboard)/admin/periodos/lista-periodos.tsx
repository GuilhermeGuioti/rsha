"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "../../../../../components/Pill";
import { Modal } from "../../../../../components/Modal";
import { BotaoPrimario } from "../../../../../components/BotaoPrimario";
import { BotaoSecundario } from "../../../../../components/BotaoSecundario";
import { Campo, classeCampo, classeCampoSelect } from "../../../../../components/Campo";
import { TabelaAdmin } from "../../../../../components/TabelaAdmin";
import { CabecalhoAdmin } from "../../../../../components/CabecalhoAdmin";
import { LinhaVazia } from "../../../../../components/LinhaVazia";
import { LinkAcaoTabela } from "../../../../../components/LinkAcaoTabela";
import { MensagemErro } from "../../../../../components/MensagemErro";
import { acaoCriarPeriodo, acaoAtualizarPeriodo } from "./acoes";

type PeriodoLinha = {
  id: number;
  ano: number;
  semestre: number;
  aberturaSubmissao: string;
  encerramentoSubmissao: string;
};

// datetime-local não aceita ISO com timezone — formata em horário local.
function paraCampoData(iso: string): string {
  const data = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function situacaoPeriodo(periodo: PeriodoLinha): { rotulo: string; cor: "aprovado" | "neutro" | "interativo" } {
  const agora = new Date();
  if (agora < new Date(periodo.aberturaSubmissao)) return { rotulo: "Agendado", cor: "interativo" };
  if (agora > new Date(periodo.encerramentoSubmissao)) return { rotulo: "Encerrado", cor: "neutro" };
  return { rotulo: "Aberto", cor: "aprovado" };
}

export function ListaPeriodos({ periodos }: { periodos: PeriodoLinha[] }) {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [periodoEmEdicao, setPeriodoEmEdicao] = useState<PeriodoLinha | null>(null);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [semestre, setSemestre] = useState(1);
  const [abertura, setAbertura] = useState("");
  const [encerramento, setEncerramento] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function abrirNovo() {
    setPeriodoEmEdicao(null);
    setAno(new Date().getFullYear());
    setSemestre(1);
    setAbertura("");
    setEncerramento("");
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(periodo: PeriodoLinha) {
    setPeriodoEmEdicao(periodo);
    setAno(periodo.ano);
    setSemestre(periodo.semestre);
    setAbertura(paraCampoData(periodo.aberturaSubmissao));
    setEncerramento(paraCampoData(periodo.encerramentoSubmissao));
    setErro(null);
    setModalAberto(true);
  }

  function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    const dados = {
      ano,
      semestre,
      aberturaSubmissao: new Date(abertura),
      encerramentoSubmissao: new Date(encerramento),
    };
    startTransition(async () => {
      const resultado = periodoEmEdicao
        ? await acaoAtualizarPeriodo(periodoEmEdicao.id, dados)
        : await acaoCriarPeriodo(dados);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      setModalAberto(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoAdmin
        titulo="Períodos letivos"
        subtitulo={
          <p className="text-[15px] text-tinta-suave">
            Cada período define a janela em que os docentes podem submeter o relatório.
          </p>
        }
        acao={
          <BotaoPrimario onClick={abrirNovo} icone>
            Novo período
          </BotaoPrimario>
        }
      />

      <TabelaAdmin minWidthPx={560}>
        <thead>
          <tr className="border-b border-borda text-[13px] text-tinta-suave">
            <th scope="col" className="px-4 py-2.5 font-medium">Período</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Abertura</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Encerramento</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Situação</th>
            <th scope="col" className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {periodos.length === 0 && <LinhaVazia colSpan={5}>Nenhum período letivo cadastrado.</LinhaVazia>}
          {periodos.map((periodo) => {
            const situacao = situacaoPeriodo(periodo);
            return (
              <tr key={periodo.id} className="border-b border-[#f0f3f6] last:border-0">
                <td className="px-4 py-3 font-serif font-semibold">{periodo.ano}/{periodo.semestre}</td>
                <td className="px-4 py-3 font-mono font-medium tabular-nums text-tinta-suave">
                  {formatarData(periodo.aberturaSubmissao)}
                </td>
                <td className="px-4 py-3 font-mono font-medium tabular-nums">
                  {formatarData(periodo.encerramentoSubmissao)}
                </td>
                <td className="px-4 py-3">
                  <Pill cor={situacao.cor}>{situacao.rotulo}</Pill>
                </td>
                <td className="px-4 py-3 text-right">
                  <LinkAcaoTabela onClick={() => abrirEdicao(periodo)}>Editar</LinkAcaoTabela>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TabelaAdmin>

      <Modal
        aberto={modalAberto}
        eyebrow="ADMINISTRAÇÃO · PERÍODOS"
        titulo={periodoEmEdicao ? "Editar período" : "Novo período"}
        descricao="Fora da janela entre abertura e encerramento, a submissão do relatório é bloqueada."
        onFechar={() => setModalAberto(false)}
        rodape={
          <>
            <BotaoSecundario onClick={() => setModalAberto(false)}>Cancelar</BotaoSecundario>
            <BotaoPrimario type="submit" form="form-periodo" disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar período"}
            </BotaoPrimario>
          </>
        }
      >
        <form id="form-periodo" onSubmit={salvar} className="flex flex-col gap-4">
          {erro && <MensagemErro>{erro}</MensagemErro>}
          <div className="flex gap-4">
            <Campo rotulo="Ano" htmlFor="ano-periodo" className="flex-1">
              <input
                id="ano-periodo"
                type="number"
                value={ano}
                onChange={(evento) => setAno(Number(evento.target.value))}
                required
                className={`${classeCampo} font-mono tabular-nums`}
              />
            </Campo>
            <Campo rotulo="Semestre" htmlFor="semestre-periodo" className="flex-1">
              <select
                id="semestre-periodo"
                value={semestre}
                onChange={(evento) => setSemestre(Number(evento.target.value))}
                className={classeCampoSelect}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </Campo>
          </div>
          <Campo rotulo="Abertura da submissão" htmlFor="abertura-periodo">
            <input
              id="abertura-periodo"
              type="datetime-local"
              value={abertura}
              onChange={(evento) => setAbertura(evento.target.value)}
              required
              className={classeCampo}
            />
          </Campo>
          <Campo rotulo="Encerramento da submissão" htmlFor="encerramento-periodo">
            <input
              id="encerramento-periodo"
              type="datetime-local"
              value={encerramento}
              onChange={(evento) => setEncerramento(evento.target.value)}
              required
              className={classeCampo}
            />
          </Campo>
        </form>
      </Modal>
    </div>
  );
}
