"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "../../../../../components/Pill";
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
import { useBusca } from "../../../../../lib/hooks/useBusca";
import { acaoCriarCurso, acaoAtualizarCurso } from "./acoes";

type CursoLinha = {
  id: number;
  nome: string;
  ativo: boolean;
  coordenadores: string[];
  totalDocentes: number;
};

export function ListaCursos({ cursos }: { cursos: CursoLinha[] }) {
  const router = useRouter();
  const [aba, setAba] = useState<"ativos" | "inativos">("ativos");
  const [modalAberto, setModalAberto] = useState(false);
  const [cursoEmEdicao, setCursoEmEdicao] = useState<CursoLinha | null>(null);
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const busca = useBusca();

  const cursosAtivos = cursos.filter((curso) => curso.ativo);
  const cursosInativos = cursos.filter((curso) => !curso.ativo);
  const visiveis = (aba === "ativos" ? cursosAtivos : cursosInativos).filter((curso) =>
    curso.nome.toLowerCase().includes(busca.normalizado),
  );

  function abrirNovo() {
    setCursoEmEdicao(null);
    setNome("");
    setAtivo(true);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(curso: CursoLinha) {
    setCursoEmEdicao(curso);
    setNome(curso.nome);
    setAtivo(curso.ativo);
    setErro(null);
    setModalAberto(true);
  }

  function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    const dados = { nome, ativo };
    startTransition(async () => {
      const resultado = cursoEmEdicao
        ? await acaoAtualizarCurso(cursoEmEdicao.id, dados)
        : await acaoCriarCurso(dados);
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
        titulo="Cursos"
        subtitulo={
          <p className="text-[15px] text-tinta-suave">Cada curso gera um relatório por docente e por semestre.</p>
        }
        acao={
          <BotaoPrimario onClick={abrirNovo} icone>
            Novo curso
          </BotaoPrimario>
        }
      />

      <div className="flex flex-wrap gap-2">
        <CampoBusca
          id="busca-curso"
          rotuloAcessivel="Buscar curso por nome"
          placeholder="Buscar curso…"
          valor={busca.valor}
          onChange={busca.definir}
        />
        <AbasFiltro
          aba={aba}
          onMudar={setAba}
          opcoes={[
            { valor: "ativos", rotulo: "Ativos", contagem: cursosAtivos.length },
            { valor: "inativos", rotulo: "Inativos", contagem: cursosInativos.length },
          ]}
        />
      </div>

      <Tabela<CursoLinha>
        minWidthPx={620}
        linhas={visiveis}
        chave={(curso) => curso.id}
        vazio={
          busca.normalizado
            ? "Nenhum curso encontrado."
            : `Nenhum curso ${aba === "ativos" ? "ativo" : "inativo"}.`
        }
        colunas={[
          { cabecalho: "Curso", render: (curso) => curso.nome },
          {
            cabecalho: "Coordenação",
            classeCelula: "text-tinta-suave",
            render: (curso) =>
              curso.coordenadores.length > 0 ? curso.coordenadores.join(", ") : "sem coordenação definida",
          },
          {
            cabecalho: "Docentes",
            alinhado: "direita",
            classeCelula: "font-mono font-medium tabular-nums",
            render: (curso) => curso.totalDocentes,
          },
          {
            cabecalho: "Situação",
            render: (curso) => (
              <Pill cor={curso.ativo ? "aprovado" : "neutro"}>{curso.ativo ? "Ativo" : "Inativo"}</Pill>
            ),
          },
          {
            cabecalho: "",
            alinhado: "direita",
            render: (curso) => (
              <AcaoTabela rotulo={`Editar ${curso.nome}`} onClick={() => abrirEdicao(curso)}>
                <IconeEditar className="h-[18px] w-[18px]" />
              </AcaoTabela>
            ),
          },
        ]}
      />

      <Modal
        aberto={modalAberto}
        eyebrow="ADMINISTRAÇÃO · CURSOS"
        titulo={cursoEmEdicao ? "Editar curso" : "Novo curso"}
        onFechar={() => setModalAberto(false)}
        rodape={
          <>
            <BotaoSecundario onClick={() => setModalAberto(false)}>Cancelar</BotaoSecundario>
            <BotaoPrimario type="submit" form="form-curso" disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar curso"}
            </BotaoPrimario>
          </>
        }
      >
        <form id="form-curso" onSubmit={salvar} className="flex flex-col gap-4">
          {erro && <MensagemErro>{erro}</MensagemErro>}
          <Campo rotulo="Nome do curso" htmlFor="nome-curso">
            <input
              id="nome-curso"
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              required
              className={classeCampo}
            />
          </Campo>
          <CampoCheckbox id="curso-ativo" rotulo="Curso ativo" checked={ativo} onChange={setAtivo} className="pt-1" />
        </form>
      </Modal>
    </div>
  );
}
