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
import { CampoBusca } from "../../../../../components/CampoBusca";
import { AbasAtivoInativo } from "../../../../../components/AbasAtivoInativo";
import { LinhaVazia } from "../../../../../components/LinhaVazia";
import { LinkAcaoTabela } from "../../../../../components/LinkAcaoTabela";
import { CampoCheckbox } from "../../../../../components/CampoCheckbox";
import { MensagemErro } from "../../../../../components/MensagemErro";
import { acaoCriarCurso, acaoAtualizarCurso } from "./acoes";

type CursoLinha = {
  id: number;
  nome: string;
  ativo: boolean;
  avaliadorAlternativoId: number | null;
  avaliadorAlternativoNome: string | null;
  coordenadores: string[];
  totalDocentes: number;
};

type UsuarioOpcao = { id: number; nome: string };

export function ListaCursos({
  cursos,
  usuariosDisponiveis,
}: {
  cursos: CursoLinha[];
  usuariosDisponiveis: UsuarioOpcao[];
}) {
  const router = useRouter();
  const [aba, setAba] = useState<"ativos" | "inativos">("ativos");
  const [modalAberto, setModalAberto] = useState(false);
  const [cursoEmEdicao, setCursoEmEdicao] = useState<CursoLinha | null>(null);
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [avaliadorAlternativoId, setAvaliadorAlternativoId] = useState<number | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const [busca, setBusca] = useState("");

  const cursosAtivos = cursos.filter((curso) => curso.ativo);
  const cursosInativos = cursos.filter((curso) => !curso.ativo);
  const buscaNormalizada = busca.trim().toLowerCase();
  const visiveis = (aba === "ativos" ? cursosAtivos : cursosInativos).filter((curso) =>
    curso.nome.toLowerCase().includes(buscaNormalizada),
  );

  function abrirNovo() {
    setCursoEmEdicao(null);
    setNome("");
    setAtivo(true);
    setAvaliadorAlternativoId("");
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(curso: CursoLinha) {
    setCursoEmEdicao(curso);
    setNome(curso.nome);
    setAtivo(curso.ativo);
    setAvaliadorAlternativoId(curso.avaliadorAlternativoId ?? "");
    setErro(null);
    setModalAberto(true);
  }

  function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    const dados = {
      nome,
      ativo,
      avaliadorAlternativoId: avaliadorAlternativoId === "" ? null : Number(avaliadorAlternativoId),
    };
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

      <div className="flex gap-2">
        <CampoBusca
          id="busca-curso"
          rotuloAcessivel="Buscar curso por nome"
          placeholder="Buscar curso…"
          valor={busca}
          onChange={setBusca}
        />
        <AbasAtivoInativo
          aba={aba}
          onMudar={setAba}
          contagemAtivos={cursosAtivos.length}
          contagemInativos={cursosInativos.length}
        />
      </div>

      <TabelaAdmin minWidthPx={620}>
        <thead>
          <tr className="border-b border-borda text-[13px] text-tinta-suave">
            <th scope="col" className="px-4 py-2.5 font-medium">Curso</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Coordenação</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Docentes</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Situação</th>
            <th scope="col" className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {visiveis.length === 0 && (
            <LinhaVazia colSpan={5}>
              {buscaNormalizada
                ? "Nenhum curso encontrado."
                : `Nenhum curso ${aba === "ativos" ? "ativo" : "inativo"}.`}
            </LinhaVazia>
          )}
          {visiveis.map((curso) => (
            <tr key={curso.id} className="border-b border-[#f0f3f6] last:border-0">
              <td className="px-4 py-3">{curso.nome}</td>
              <td className="px-4 py-3 text-tinta-suave">
                {curso.coordenadores.length > 0 ? curso.coordenadores.join(", ") : "sem coordenação definida"}
              </td>
              <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">{curso.totalDocentes}</td>
              <td className="px-4 py-3">
                <Pill cor={curso.ativo ? "aprovado" : "neutro"}>{curso.ativo ? "Ativo" : "Inativo"}</Pill>
              </td>
              <td className="px-4 py-3 text-right">
                <LinkAcaoTabela onClick={() => abrirEdicao(curso)}>Editar</LinkAcaoTabela>
              </td>
            </tr>
          ))}
        </tbody>
      </TabelaAdmin>

      <Modal
        aberto={modalAberto}
        eyebrow="ADMINISTRAÇÃO · CURSOS"
        titulo={cursoEmEdicao ? "Editar curso" : "Novo curso"}
        descricao="O avaliador alternativo assume quando o próprio coordenador do curso é o autor do relatório."
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
          <Campo rotulo="Avaliador alternativo" htmlFor="avaliador-alternativo">
            <select
              id="avaliador-alternativo"
              value={avaliadorAlternativoId}
              onChange={(evento) =>
                setAvaliadorAlternativoId(evento.target.value === "" ? "" : Number(evento.target.value))
              }
              className={classeCampoSelect}
            >
              <option value="">— nenhum —</option>
              {usuariosDisponiveis.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </option>
              ))}
            </select>
          </Campo>
          <CampoCheckbox id="curso-ativo" rotulo="Curso ativo" checked={ativo} onChange={setAtivo} className="pt-1" />
        </form>
      </Modal>
    </div>
  );
}
