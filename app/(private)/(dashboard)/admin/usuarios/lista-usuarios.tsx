"use client";

import { Fragment, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "../../../../../components/Pill";
import { Modal } from "../../../../../components/Modal";
import { acaoCriarUsuario, acaoAtualizarUsuario } from "./acoes";
import type { Perfil as TipoPerfil } from "../../../../../generated/prisma/client";

type UsuarioLinha = {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
  secretaria: boolean;
  perfis: TipoPerfil[];
  cursos: string[];
};

const rotuloPerfil: Record<TipoPerfil, { rotulo: string; cor: "interativo" | "aprovado" | "neutro" }> = {
  DOCENTE: { rotulo: "Docente", cor: "interativo" },
  COORDENADOR: { rotulo: "Coordenação", cor: "aprovado" },
  SECRETARIA: { rotulo: "Secretaria", cor: "neutro" },
};

const COLUNAS = 4;

export function ListaUsuarios({ usuarios }: { usuarios: UsuarioLinha[] }) {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<UsuarioLinha | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [secretaria, setSecretaria] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<"ativos" | "inativos">("ativos");
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());

  const usuariosAtivos = usuarios.filter((usuario) => usuario.ativo);
  const usuariosInativos = usuarios.filter((usuario) => !usuario.ativo);
  const buscaNormalizada = busca.trim().toLowerCase();
  const visiveis = (aba === "ativos" ? usuariosAtivos : usuariosInativos).filter(
    (usuario) =>
      usuario.nome.toLowerCase().includes(buscaNormalizada) ||
      usuario.email.toLowerCase().includes(buscaNormalizada),
  );

  function alternarExpandido(id: number) {
    setExpandidos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        proximo.add(id);
      }
      return proximo;
    });
  }

  function abrirNovo() {
    setUsuarioEmEdicao(null);
    setNome("");
    setEmail("");
    setAtivo(true);
    setSecretaria(false);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(usuario: UsuarioLinha) {
    setUsuarioEmEdicao(usuario);
    setNome(usuario.nome);
    setEmail(usuario.email);
    setAtivo(usuario.ativo);
    setSecretaria(usuario.secretaria);
    setErro(null);
    setModalAberto(true);
  }

  function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    const dados = { nome, email, ativo, secretaria };
    startTransition(async () => {
      const resultado = usuarioEmEdicao
        ? await acaoAtualizarUsuario(usuarioEmEdicao.id, dados)
        : await acaoCriarUsuario(dados);
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
          <h1 className="font-serif text-2xl font-semibold text-azul-interativo">Usuários</h1>
          <p className="mt-1 text-[15px] text-tinta-suave">
            Pessoas com acesso ao sistema. Clique numa pessoa para ver perfil e cursos.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNovo}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-azul-institucional bg-azul-institucional px-4 text-sm font-medium text-white hover:bg-azul-interativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">+</span>
          Novo usuário
        </button>
      </div>

      <div className="flex gap-2">
        <label htmlFor="busca-usuario" className="sr-only">Buscar usuário por nome ou e-mail</label>
        <input
          id="busca-usuario"
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          className="min-h-10 w-full rounded-md border border-borda bg-superficie px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo sm:w-80"
        />
        <button
          type="button"
          onClick={() => setAba("ativos")}
          className={`flex min-h-10 items-center rounded-md px-3.5 text-sm font-medium ${aba === "ativos" ? "bg-azul-institucional text-white" : "border border-borda bg-superficie text-tinta-suave"}`}
        >
          Ativos ({usuariosAtivos.length})
        </button>
        <button
          type="button"
          onClick={() => setAba("inativos")}
          className={`flex min-h-10 items-center rounded-md px-3.5 text-sm font-medium ${aba === "inativos" ? "bg-azul-institucional text-white" : "border border-borda bg-superficie text-tinta-suave"}`}
        >
          Inativos ({usuariosInativos.length})
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-borda bg-superficie">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-borda text-tinta-suave">
              <th scope="col" className="px-4 py-2.5 font-medium">Pessoa</th>
              <th scope="col" className="px-4 py-2.5 font-medium">E-mail institucional</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Situação</th>
              <th scope="col" className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={COLUNAS} className="px-4 py-6 text-center text-tinta-suave">
                  {buscaNormalizada
                    ? "Nenhum usuário encontrado."
                    : `Nenhum usuário ${aba === "ativos" ? "ativo" : "inativo"}.`}
                </td>
              </tr>
            )}
            {visiveis.map((usuario) => {
              const aberto = expandidos.has(usuario.id);
              return (
                <Fragment key={usuario.id}>
                  <tr className="border-b border-[#f0f3f6] last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => alternarExpandido(usuario.id)}
                        aria-expanded={aberto}
                        aria-controls={`detalhes-usuario-${usuario.id}`}
                        className="flex items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
                      >
                        <span
                          aria-hidden
                          className={`text-xs text-tinta-suave transition-transform ${aberto ? "rotate-90" : ""}`}
                        >
                          ▸
                        </span>
                        {usuario.nome}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-tinta-suave">
                      {usuario.email}
                    </td>
                    <td className="px-4 py-3">
                      <Pill cor={usuario.ativo ? "aprovado" : "neutro"}>{usuario.ativo ? "Ativo" : "Inativo"}</Pill>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(usuario)}
                        className="font-medium text-azul-interativo hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                  {aberto && (
                    <tr id={`detalhes-usuario-${usuario.id}`} className="border-b border-[#f0f3f6] bg-papel last:border-0">
                      <td colSpan={COLUNAS} className="px-4 py-3">
                        <div className="flex flex-wrap gap-x-10 gap-y-3 text-sm">
                          <div>
                            <div className="text-xs font-medium text-tinta-suave">Perfil</div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {usuario.perfis.length === 0 && <span className="text-tinta-suave">—</span>}
                              {usuario.perfis.map((perfil) => (
                                <Pill key={perfil} cor={rotuloPerfil[perfil].cor}>
                                  {rotuloPerfil[perfil].rotulo}
                                </Pill>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-tinta-suave">Cursos</div>
                            {usuario.cursos.length === 0 ? (
                              <div className="mt-1.5 text-tinta-suave">—</div>
                            ) : (
                              <ul className="mt-1.5 flex flex-col gap-1">
                                {usuario.cursos.map((curso) => (
                                  <li key={curso}>{curso}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        aberto={modalAberto}
        eyebrow="ADMINISTRAÇÃO · USUÁRIOS"
        titulo={usuarioEmEdicao ? "Editar usuário" : "Novo usuário"}
        descricao="Docente e coordenação são consequência do vínculo com o curso, cadastrado em outra tela."
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
              form="form-usuario"
              disabled={pendente}
              className="flex min-h-11 items-center rounded-md border border-azul-institucional bg-azul-institucional px-5 text-sm font-medium text-white hover:bg-azul-interativo disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendente ? "Salvando…" : "Salvar usuário"}
            </button>
          </>
        }
      >
        <form id="form-usuario" onSubmit={salvar} className="flex flex-col gap-4">
          {erro && (
            <p role="alert" className="text-sm font-medium text-estado-devolvido">
              {erro}
            </p>
          )}
          <label htmlFor="nome-usuario" className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-tinta-suave">Nome</span>
            <input
              id="nome-usuario"
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              required
              className="min-h-11 rounded-md border border-borda px-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
            />
          </label>
          <label htmlFor="email-usuario" className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-tinta-suave">E-mail institucional</span>
            <input
              id="email-usuario"
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              required
              className="min-h-11 rounded-md border border-borda px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
            />
          </label>
          <label htmlFor="usuario-ativo" className="flex items-center gap-2.5 pt-1">
            <input
              id="usuario-ativo"
              type="checkbox"
              checked={ativo}
              onChange={(evento) => setAtivo(evento.target.checked)}
              className="h-5 w-5 rounded border-borda focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
            />
            <span className="text-[15px]">Usuário ativo</span>
          </label>
          <label htmlFor="usuario-secretaria" className="flex items-center gap-2.5">
            <input
              id="usuario-secretaria"
              type="checkbox"
              checked={secretaria}
              onChange={(evento) => setSecretaria(evento.target.checked)}
              className="h-5 w-5 rounded border-borda focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
            />
            <span className="text-[15px]">Secretaria acadêmica</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
