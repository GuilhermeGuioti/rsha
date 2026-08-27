"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "../../../../../components/Pill";
import { Modal } from "../../../../../components/Modal";
import { BotaoPrimario } from "../../../../../components/BotaoPrimario";
import { BotaoSecundario } from "../../../../../components/BotaoSecundario";
import { Campo, classeCampo, classeCampoSelect } from "../../../../../components/Campo";
import { Tabela } from "../../../../../components/Tabela";
import { CabecalhoAdmin } from "../../../../../components/CabecalhoAdmin";
import { AcaoTabela } from "../../../../../components/AcaoTabela";
import { IconeEditar } from "../../../../../components/Icones";
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

      <Tabela<PeriodoLinha>
        minWidthPx={560}
        linhas={periodos}
        chave={(periodo) => periodo.id}
        vazio="Nenhum período letivo cadastrado."
        colunas={[
          {
            cabecalho: "Período",
            classeCelula: "font-serif font-semibold",
            render: (periodo) => `${periodo.ano}/${periodo.semestre}`,
          },
          {
            cabecalho: "Abertura",
            classeCelula: "font-mono font-medium tabular-nums text-tinta-suave",
            render: (periodo) => formatarData(periodo.aberturaSubmissao),
          },
          {
            cabecalho: "Encerramento",
            classeCelula: "font-mono font-medium tabular-nums",
            render: (periodo) => formatarData(periodo.encerramentoSubmissao),
          },
          {
            cabecalho: "Situação",
            render: (periodo) => {
              const situacao = situacaoPeriodo(periodo);
              return <Pill cor={situacao.cor}>{situacao.rotulo}</Pill>;
            },
          },
          {
            cabecalho: "",
            alinhado: "direita",
            render: (periodo) => (
              <AcaoTabela
                rotulo={`Editar período ${periodo.ano}/${periodo.semestre}`}
                onClick={() => abrirEdicao(periodo)}
              >
                <IconeEditar className="h-[18px] w-[18px]" />
              </AcaoTabela>
            ),
          },
        ]}
      />

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
