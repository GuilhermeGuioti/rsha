"use client";

import { Fragment, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "../../../../../components/Pill";
import { Modal } from "../../../../../components/Modal";
import { BotaoPrimario } from "../../../../../components/BotaoPrimario";
import { BotaoSecundario } from "../../../../../components/BotaoSecundario";
import { Campo, classeCampo } from "../../../../../components/Campo";
import { TabelaAdmin } from "../../../../../components/TabelaAdmin";
import { CabecalhoAdmin } from "../../../../../components/CabecalhoAdmin";
import { CampoBusca } from "../../../../../components/CampoBusca";
import { AbasAtivoInativo } from "../../../../../components/AbasAtivoInativo";
import { LinhaVazia } from "../../../../../components/LinhaVazia";
import { LinkAcaoTabela } from "../../../../../components/LinkAcaoTabela";
import { CampoCheckbox } from "../../../../../components/CampoCheckbox";
import { MensagemErro } from "../../../../../components/MensagemErro";
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
      <CabecalhoAdmin
        titulo="Usuários"
        subtitulo={
          <p className="text-[15px] text-tinta-suave">
            Pessoas com acesso ao sistema. Clique numa pessoa para ver perfil e cursos.
          </p>
        }
        acao={
          <BotaoPrimario onClick={abrirNovo} icone>
            Novo usuário
          </BotaoPrimario>
        }
      />

      <div className="flex gap-2">
        <CampoBusca
          id="busca-usuario"
          rotuloAcessivel="Buscar usuário por nome ou e-mail"
          placeholder="Buscar por nome ou e-mail…"
          valor={busca}
          onChange={setBusca}
        />
        <AbasAtivoInativo
          aba={aba}
          onMudar={setAba}
          contagemAtivos={usuariosAtivos.length}
          contagemInativos={usuariosInativos.length}
        />
      </div>

      <TabelaAdmin minWidthPx={560}>
        <thead>
          <tr className="border-b border-borda text-[13px] text-tinta-suave">
            <th scope="col" className="px-4 py-2.5 font-medium">Pessoa</th>
            <th scope="col" className="px-4 py-2.5 font-medium">E-mail institucional</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Situação</th>
            <th scope="col" className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {visiveis.length === 0 && (
            <LinhaVazia colSpan={COLUNAS}>
              {buscaNormalizada
                ? "Nenhum usuário encontrado."
                : `Nenhum usuário ${aba === "ativos" ? "ativo" : "inativo"}.`}
            </LinhaVazia>
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
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-[13px] font-medium text-tinta-suave">
                    {usuario.email}
                  </td>
                  <td className="px-4 py-3">
                    <Pill cor={usuario.ativo ? "aprovado" : "neutro"}>{usuario.ativo ? "Ativo" : "Inativo"}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <LinkAcaoTabela onClick={() => abrirEdicao(usuario)}>Editar</LinkAcaoTabela>
                  </td>
                </tr>
                {aberto && (
                  <tr id={`detalhes-usuario-${usuario.id}`} className="border-b border-[#f0f3f6] bg-papel last:border-0">
                    <td colSpan={COLUNAS} className="px-4 py-3">
                      <div className="flex flex-wrap gap-x-10 gap-y-3 text-[15px]">
                        <div>
                          <div className="text-[13px] font-medium text-tinta-suave">Perfil</div>
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
                          <div className="text-[13px] font-medium text-tinta-suave">Cursos</div>
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
      </TabelaAdmin>

      <Modal
        aberto={modalAberto}
        eyebrow="ADMINISTRAÇÃO · USUÁRIOS"
        titulo={usuarioEmEdicao ? "Editar usuário" : "Novo usuário"}
        descricao="Docente e coordenação são consequência do vínculo com o curso, cadastrado em outra tela."
        onFechar={() => setModalAberto(false)}
        rodape={
          <>
            <BotaoSecundario onClick={() => setModalAberto(false)}>Cancelar</BotaoSecundario>
            <BotaoPrimario type="submit" form="form-usuario" disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar usuário"}
            </BotaoPrimario>
          </>
        }
      >
        <form id="form-usuario" onSubmit={salvar} className="flex flex-col gap-4">
          {erro && <MensagemErro>{erro}</MensagemErro>}
          <Campo rotulo="Nome" htmlFor="nome-usuario">
            <input
              id="nome-usuario"
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              required
              className={classeCampo}
            />
          </Campo>
          <Campo rotulo="E-mail institucional" htmlFor="email-usuario">
            <input
              id="email-usuario"
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              required
              className={classeCampo}
            />
          </Campo>
          <CampoCheckbox id="usuario-ativo" rotulo="Usuário ativo" checked={ativo} onChange={setAtivo} className="pt-1" />
          <CampoCheckbox id="usuario-secretaria" rotulo="Secretaria acadêmica" checked={secretaria} onChange={setSecretaria} />
        </form>
      </Modal>
    </div>
  );
}
