"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "../../../components/Pill";
import { Modal } from "../../../components/Modal";
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-azul-interativo">Cursos</h1>
          <p className="mt-1 text-[15px] text-tinta-suave">
            Cada curso gera um relatório por docente e por semestre.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNovo}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-azul-institucional bg-azul-institucional px-4 text-sm font-medium text-white hover:bg-azul-interativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">+</span>
          Novo curso
        </button>
      </div>

      <div className="flex gap-2">
        <label htmlFor="busca-curso" className="sr-only">Buscar curso por nome</label>
        <input
          id="busca-curso"
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar curso…"
          className="min-h-10 w-full rounded-md border border-borda bg-superficie px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo sm:w-80"
        />
        <button
          type="button"
          onClick={() => setAba("ativos")}
          className={`flex min-h-10 items-center rounded-md px-3.5 text-sm font-medium ${aba === "ativos" ? "bg-azul-institucional text-white" : "border border-borda bg-superficie text-tinta-suave"}`}
        >
          Ativos ({cursosAtivos.length})
        </button>
        <button
          type="button"
          onClick={() => setAba("inativos")}
          className={`flex min-h-10 items-center rounded-md px-3.5 text-sm font-medium ${aba === "inativos" ? "bg-azul-institucional text-white" : "border border-borda bg-superficie text-tinta-suave"}`}
        >
          Inativos ({cursosInativos.length})
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-borda bg-superficie">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-borda text-tinta-suave">
              <th scope="col" className="px-4 py-2.5 font-medium">Curso</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Coordenação</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Docentes</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Situação</th>
              <th scope="col" className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-tinta-suave">
                  {buscaNormalizada
                    ? "Nenhum curso encontrado."
                    : `Nenhum curso ${aba === "ativos" ? "ativo" : "inativo"}.`}
                </td>
              </tr>
            )}
            {visiveis.map((curso) => (
              <tr key={curso.id} className="border-b border-[#f0f3f6] last:border-0">
                <td className="px-4 py-3">{curso.nome}</td>
                <td className="px-4 py-3 text-tinta-suave">
                  {curso.coordenadores.length > 0 ? curso.coordenadores.join(", ") : "sem coordenação definida"}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{curso.totalDocentes}</td>
                <td className="px-4 py-3">
                  <Pill cor={curso.ativo ? "aprovado" : "neutro"}>{curso.ativo ? "Ativo" : "Inativo"}</Pill>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => abrirEdicao(curso)}
                    className="font-medium text-azul-interativo hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        aberto={modalAberto}
        eyebrow="ADMINISTRAÇÃO · CURSOS"
        titulo={cursoEmEdicao ? "Editar curso" : "Novo curso"}
        descricao="O avaliador alternativo assume quando o próprio coordenador do curso é o autor do relatório."
        onFechar={() => setModalAberto(false)}
        rodape={
          <>
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className="flex min-h-11 items-center rounded-md border border-[#92cde9] bg-superficie px-4 text-sm font-medium text-azul-interativo"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-curso"
              disabled={pendente}
              className="flex min-h-11 items-center rounded-md border border-azul-institucional bg-azul-institucional px-5 text-sm font-medium text-white hover:bg-azul-interativo disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendente ? "Salvando…" : "Salvar curso"}
            </button>
          </>
        }
      >
        <form id="form-curso" onSubmit={salvar} className="flex flex-col gap-4">
          {erro && (
            <p role="alert" className="text-sm font-medium text-estado-devolvido">
              {erro}
            </p>
          )}
          <label htmlFor="nome-curso" className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-tinta-suave">Nome do curso</span>
            <input
              id="nome-curso"
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              required
              className="min-h-11 rounded-md border border-borda px-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
            />
          </label>
          <label htmlFor="avaliador-alternativo" className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-tinta-suave">Avaliador alternativo</span>
            <select
              id="avaliador-alternativo"
              value={avaliadorAlternativoId}
              onChange={(evento) =>
                setAvaliadorAlternativoId(evento.target.value === "" ? "" : Number(evento.target.value))
              }
              className="min-h-11 rounded-md border border-borda bg-superficie px-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
            >
              <option value="">— nenhum —</option>
              {usuariosDisponiveis.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="curso-ativo" className="flex items-center gap-2.5 pt-1">
            <input
              id="curso-ativo"
              type="checkbox"
              checked={ativo}
              onChange={(evento) => setAtivo(evento.target.checked)}
              className="h-5 w-5 rounded border-borda focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
            />
            <span className="text-[15px]">Curso ativo</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
