"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PillAtivo } from "../../../../../components/PillAtivo";
import { Modal } from "../../../../../components/Modal";
import { BotaoPrimario } from "../../../../../components/BotaoPrimario";
import { BotaoSecundario } from "../../../../../components/BotaoSecundario";
import { Campo, classeCampo } from "../../../../../components/Campo";
import { Tabela } from "../../../../../components/Tabela";
import { CabecalhoAdmin } from "../../../../../components/CabecalhoAdmin";
import { CampoBusca } from "../../../../../components/CampoBusca";
import { AbasFiltro } from "../../../../../components/AbasFiltro";
import { AcaoTabela } from "../../../../../components/AcaoTabela";
import { IconeEditar } from "../../../../../components/Icones";
import { CampoCheckbox } from "../../../../../components/CampoCheckbox";
import { MensagemErro } from "../../../../../components/MensagemErro";
import { ImportadorPlanilha } from "../../../../../components/ImportadorPlanilha";
import { MODELOS_IMPORTACAO } from "../../../../../lib/importacao";
import { useBusca } from "../../../../../lib/hooks/useBusca";
import { acaoCriarTipoAtividade, acaoAtualizarTipoAtividade, acaoImportarTiposAtividade } from "./acoes";

type TipoAtividadeLinha = {
  id: number;
  descricao: string;
  ativo: boolean;
  totalItens: number;
};

export function ListaTiposAtividade({ tipos }: { tipos: TipoAtividadeLinha[] }) {
  const router = useRouter();
  const [aba, setAba] = useState<"ativos" | "inativos">("ativos");
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoEmEdicao, setTipoEmEdicao] = useState<TipoAtividadeLinha | null>(null);
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const busca = useBusca();

  const tiposAtivos = tipos.filter((tipo) => tipo.ativo);
  const tiposInativos = tipos.filter((tipo) => !tipo.ativo);
  const visiveis = (aba === "ativos" ? tiposAtivos : tiposInativos).filter((tipo) =>
    tipo.descricao.toLowerCase().includes(busca.normalizado),
  );

  function abrirNovo() {
    setTipoEmEdicao(null);
    setDescricao("");
    setAtivo(true);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(tipo: TipoAtividadeLinha) {
    setTipoEmEdicao(tipo);
    setDescricao(tipo.descricao);
    setAtivo(tipo.ativo);
    setErro(null);
    setModalAberto(true);
  }

  function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    const dados = { descricao, ativo };
    startTransition(async () => {
      const resultado = tipoEmEdicao
        ? await acaoAtualizarTipoAtividade(tipoEmEdicao.id, dados)
        : await acaoCriarTipoAtividade(dados);
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
        titulo="Tipos de atividade"
        subtitulo={
          <p className="text-[15px] text-tinta-suave">
            Opções do campo “Tipo” em cada item do relatório. Inativar tira o tipo dos relatórios novos e preserva
            os que já o usam.
          </p>
        }
        acao={
          <>
            <ImportadorPlanilha
              modelo={MODELOS_IMPORTACAO.tiposAtividade}
              eyebrow="ADMINISTRAÇÃO · TIPOS DE ATIVIDADE"
              titulo="Importar tipos de atividade"
              descricao="Um tipo por linha. Tipo já cadastrado é ignorado, sem alterar o existente."
              acao={acaoImportarTiposAtividade}
            />
            <BotaoPrimario onClick={abrirNovo} icone>
              Novo tipo
            </BotaoPrimario>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <CampoBusca
          id="busca-tipo-atividade"
          rotuloAcessivel="Buscar tipo de atividade por descrição"
          placeholder="Buscar tipo de atividade…"
          valor={busca.valor}
          onChange={busca.definir}
        />
        <AbasFiltro
          aba={aba}
          onMudar={setAba}
          opcoes={[
            { valor: "ativos", rotulo: "Ativos", contagem: tiposAtivos.length },
            { valor: "inativos", rotulo: "Inativos", contagem: tiposInativos.length },
          ]}
        />
      </div>

      <Tabela<TipoAtividadeLinha>
        minWidthPx={520}
        linhas={visiveis}
        chave={(tipo) => tipo.id}
        vazio={
          busca.normalizado
            ? "Nenhum tipo de atividade encontrado."
            : `Nenhum tipo de atividade ${aba === "ativos" ? "ativo" : "inativo"}.`
        }
        colunas={[
          { cabecalho: "Tipo de atividade", render: (tipo) => tipo.descricao },
          {
            cabecalho: "Itens declarados",
            alinhado: "direita",
            classeCelula: "font-mono font-medium tabular-nums",
            render: (tipo) => tipo.totalItens,
          },
          { cabecalho: "Situação", render: (tipo) => <PillAtivo ativo={tipo.ativo} /> },
          {
            cabecalho: "",
            alinhado: "direita",
            render: (tipo) => (
              <AcaoTabela rotulo={`Editar ${tipo.descricao}`} onClick={() => abrirEdicao(tipo)}>
                <IconeEditar className="h-[18px] w-[18px]" />
              </AcaoTabela>
            ),
          },
        ]}
      />

      <Modal
        aberto={modalAberto}
        eyebrow="ADMINISTRAÇÃO · TIPOS DE ATIVIDADE"
        titulo={tipoEmEdicao ? "Editar tipo de atividade" : "Novo tipo de atividade"}
        onFechar={() => setModalAberto(false)}
        rodape={
          <>
            <BotaoSecundario onClick={() => setModalAberto(false)}>Cancelar</BotaoSecundario>
            <BotaoPrimario type="submit" form="form-tipo-atividade" disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar tipo"}
            </BotaoPrimario>
          </>
        }
      >
        <form id="form-tipo-atividade" onSubmit={salvar} className="flex flex-col gap-4">
          {erro && <MensagemErro>{erro}</MensagemErro>}
          <Campo rotulo="Descrição" htmlFor="descricao-tipo-atividade">
            <input
              id="descricao-tipo-atividade"
              type="text"
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
              required
              className={classeCampo}
            />
          </Campo>
          <CampoCheckbox
            id="tipo-atividade-ativo"
            rotulo="Tipo de atividade ativo"
            checked={ativo}
            onChange={setAtivo}
            className="pt-1"
          />
        </form>
      </Modal>
    </div>
  );
}
