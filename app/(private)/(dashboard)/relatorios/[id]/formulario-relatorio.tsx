"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BotaoPrimario } from "../../../../../components/BotaoPrimario";
import { BotaoSecundario } from "../../../../../components/BotaoSecundario";
import { Campo, classeCampo, classeCampoSelect } from "../../../../../components/Campo";
import { AcaoTabela } from "../../../../../components/AcaoTabela";
import { IconeRemover } from "../../../../../components/Icones";
import { MensagemErro } from "../../../../../components/MensagemErro";
import { formatarHoras } from "../../../../../lib/formato";
import { acaoSalvarItens, acaoSubmeter } from "../acoes";

const DIAS: [string, string][] = [
  ["SEGUNDA", "Segunda"],
  ["TERCA", "Terça"],
  ["QUARTA", "Quarta"],
  ["QUINTA", "Quinta"],
  ["SEXTA", "Sexta"],
  ["SABADO", "Sábado"],
];

export type LinhaItem = {
  tipoAtividadeId: number;
  horas: number;
  diaSemana: string;
  horario: string;
  descricao: string;
};

type Tipo = { id: number; descricao: string };

// Campos em texto: o input só vira número na hora de salvar.
type Rascunho = { chave: number; tipoAtividadeId: string; horas: string; diaSemana: string; horario: string; descricao: string };

let proximaChave = 0;

function paraRascunho(item: LinhaItem): Rascunho {
  return {
    chave: proximaChave++,
    tipoAtividadeId: String(item.tipoAtividadeId),
    horas: String(item.horas),
    diaSemana: item.diaSemana,
    horario: item.horario,
    descricao: item.descricao,
  };
}

export function FormularioRelatorio({
  relatorioId,
  itensIniciais,
  tipos,
  somenteLeitura,
  atualizadoEm,
}: {
  relatorioId: number;
  itensIniciais: LinhaItem[];
  tipos: Tipo[];
  somenteLeitura: boolean;
  atualizadoEm: string;
}) {
  const router = useRouter();
  const idBase = useId();
  const [itens, setItens] = useState<Rascunho[]>(() => itensIniciais.map(paraRascunho));
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  // useRef e não useState: o handler de submit roda no mesmo tick do clique.
  const vaiEnviar = useRef(false);

  const total = itens.reduce((soma, item) => soma + (Number(item.horas) || 0), 0);

  function alterar(chave: number, campo: keyof Rascunho, valor: string) {
    setItens((atuais) =>
      atuais.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item)),
    );
  }

  function adicionarLinha() {
    setItens((atuais) => [
      ...atuais,
      {
        chave: proximaChave++,
        tipoAtividadeId: String(tipos[0]?.id ?? ""),
        horas: "",
        diaSemana: DIAS[0][0],
        horario: "",
        descricao: "",
      },
    ]);
  }

  function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    const enviar = vaiEnviar.current;

    startTransition(async () => {
      const resultado = await acaoSalvarItens(
        relatorioId,
        itens.map((item) => ({
          tipoAtividadeId: Number(item.tipoAtividadeId),
          horas: Number(item.horas),
          diaSemana: item.diaSemana,
          horario: item.horario,
          descricao: item.descricao,
        })),
      );
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      if (enviar) {
        const envio = await acaoSubmeter(relatorioId);
        if (!envio.ok) {
          setErro(envio.erro);
          return;
        }
      }
      router.refresh();
    });
  }

  if (somenteLeitura) {
    return (
      <section className="flex flex-col gap-3">
        <CabecalhoItens quantidade={itensIniciais.length} />
        {itensIniciais.map((item, indice) => (
          <div key={indice} className="grid gap-3.5 rounded-md border border-borda p-4 sm:grid-cols-[1.1fr_.8fr_.9fr_.6fr]">
            <ValorLido rotulo="Tipo de atividade">
              {tipos.find((tipo) => tipo.id === item.tipoAtividadeId)?.descricao ?? "—"}
            </ValorLido>
            <ValorLido rotulo="Dia da semana">
              {DIAS.find(([valor]) => valor === item.diaSemana)?.[1] ?? item.diaSemana}
            </ValorLido>
            <ValorLido rotulo="Horário" mono>
              {item.horario}
            </ValorLido>
            <ValorLido rotulo="Horas" mono>
              {formatarHoras(item.horas)}
            </ValorLido>
            <ValorLido rotulo="Descrição da atividade" className="sm:col-span-full">
              {item.descricao}
            </ValorLido>
          </div>
        ))}
        <TotalHoras total={total} />
      </section>
    );
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-3">
      <CabecalhoItens quantidade={itens.length} />

      {itens.map((item) => (
        <div
          key={item.chave}
          className="grid gap-3.5 rounded-md border border-borda p-4 sm:grid-cols-[1.1fr_.8fr_.9fr_.6fr_auto]"
        >
          <Campo rotulo="Tipo de atividade" htmlFor={`${idBase}-tipo-${item.chave}`}>
            <select
              id={`${idBase}-tipo-${item.chave}`}
              value={item.tipoAtividadeId}
              onChange={(evento) => alterar(item.chave, "tipoAtividadeId", evento.target.value)}
              required
              className={classeCampoSelect}
            >
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.descricao}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Dia da semana" htmlFor={`${idBase}-dia-${item.chave}`}>
            <select
              id={`${idBase}-dia-${item.chave}`}
              value={item.diaSemana}
              onChange={(evento) => alterar(item.chave, "diaSemana", evento.target.value)}
              className={classeCampoSelect}
            >
              {DIAS.map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Horário" htmlFor={`${idBase}-horario-${item.chave}`}>
            <input
              id={`${idBase}-horario-${item.chave}`}
              value={item.horario}
              onChange={(evento) => alterar(item.chave, "horario", evento.target.value)}
              required
              placeholder="14:00–17:00"
              className={`${classeCampo} font-mono`}
            />
          </Campo>
          <Campo rotulo="Horas" htmlFor={`${idBase}-horas-${item.chave}`}>
            <input
              id={`${idBase}-horas-${item.chave}`}
              type="number"
              step="0.5"
              min="0.5"
              value={item.horas}
              onChange={(evento) => alterar(item.chave, "horas", evento.target.value)}
              required
              className={`${classeCampo} font-mono tabular-nums`}
            />
          </Campo>
          <div className="flex items-end sm:pb-0.5">
            <AcaoTabela
              cor="devolvido"
              rotulo="Remover item de atividade"
              onClick={() => setItens((atuais) => atuais.filter((outro) => outro.chave !== item.chave))}
            >
              <IconeRemover className="h-[18px] w-[18px]" />
            </AcaoTabela>
          </div>
          <Campo
            rotulo="Descrição da atividade"
            htmlFor={`${idBase}-descricao-${item.chave}`}
            className="sm:col-span-full"
          >
            <input
              id={`${idBase}-descricao-${item.chave}`}
              value={item.descricao}
              onChange={(evento) => alterar(item.chave, "descricao", evento.target.value)}
              required
              className={classeCampo}
            />
          </Campo>
        </div>
      ))}

      <button
        type="button"
        onClick={adicionarLinha}
        className="min-h-11 w-full rounded-md border border-dashed border-[#92cde9] bg-superficie px-4 text-[15px] font-medium text-azul-interativo hover:bg-[#e9f6fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
      >
        + Adicionar item de atividade
      </button>

      <TotalHoras total={total} />

      {erro && <MensagemErro>{erro}</MensagemErro>}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-borda pt-5">
        <span className="text-[13px] text-tinta-suave">
          Última alteração às <span className="font-mono font-medium">{atualizadoEm}</span>
        </span>
        <div className="flex gap-3">
          <BotaoSecundario type="submit" disabled={pendente} onClick={() => (vaiEnviar.current = false)}>
            {pendente ? "Salvando…" : "Salvar rascunho"}
          </BotaoSecundario>
          <BotaoPrimario
            type="submit"
            disabled={pendente || itens.length === 0}
            onClick={() => (vaiEnviar.current = true)}
          >
            Enviar para avaliação
          </BotaoPrimario>
        </div>
      </div>
    </form>
  );
}

function CabecalhoItens({ quantidade }: { quantidade: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-serif text-lg font-semibold">Itens de atividade</h2>
      <span className="text-[13px] text-tinta-suave">
        {quantidade === 1 ? "1 item" : `${quantidade} itens`}
      </span>
    </div>
  );
}

function TotalHoras({ total }: { total: number }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-md border border-[#b7dff3] bg-[#e9f6fc] px-5 py-4">
      <div>
        <div className="text-[15px] font-medium text-azul-interativo">Total de horas atividades</div>
        <div className="mt-1.5 text-[13px] text-tinta-suave">Atualiza a cada alteração nos itens</div>
      </div>
      <div className="font-mono text-5xl font-semibold tabular-nums text-azul-interativo">
        {formatarHoras(total)}
      </div>
    </div>
  );
}

function ValorLido({
  rotulo,
  mono,
  className,
  children,
}: {
  rotulo: string;
  mono?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-[13px] font-medium text-tinta-suave">{rotulo}</span>
      <span
        className={`flex min-h-11 items-center rounded-md border border-borda px-3 text-[15px] ${mono ? "font-mono font-medium tabular-nums" : ""}`}
      >
        {children}
      </span>
    </div>
  );
}
