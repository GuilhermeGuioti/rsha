"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "../../../../../components/Modal";
import { BotaoPrimario } from "../../../../../components/BotaoPrimario";
import { BotaoSecundario } from "../../../../../components/BotaoSecundario";
import { Campo, classeCampoSelect } from "../../../../../components/Campo";
import { TabelaAdmin } from "../../../../../components/TabelaAdmin";
import { CabecalhoAdmin } from "../../../../../components/CabecalhoAdmin";
import { LinhaVazia } from "../../../../../components/LinhaVazia";
import { LinkAcaoTabela } from "../../../../../components/LinkAcaoTabela";
import { MensagemErro } from "../../../../../components/MensagemErro";
import {
  acaoVincularDocente,
  acaoDesvincularDocente,
  acaoVincularCoordenador,
  acaoDesvincularCoordenador,
} from "./acoes";

type Periodo = { id: number; rotulo: string };
type Opcao = { id: number; nome: string };
type VinculoDocente = {
  id: number;
  periodoLetivoId: number;
  cursoId: number;
  cursoNome: string;
  docenteId: number;
  docenteNome: string;
};
type VinculoCoordenador = {
  id: number;
  cursoId: number;
  cursoNome: string;
  coordenadorId: number;
  coordenadorNome: string;
};

type Modo = "docente" | "coordenador";

export function ListaVinculos({
  periodos,
  vinculosDocente,
  vinculosCoordenador,
  cursos,
  usuarios,
}: {
  periodos: Periodo[];
  vinculosDocente: VinculoDocente[];
  vinculosCoordenador: VinculoCoordenador[];
  cursos: Opcao[];
  usuarios: Opcao[];
}) {
  const router = useRouter();
  const [periodoId, setPeriodoId] = useState<number | null>(periodos[0]?.id ?? null);
  const [modo, setModo] = useState<Modo | null>(null);
  const [cursoId, setCursoId] = useState<number | "">("");
  const [pessoaId, setPessoaId] = useState<number | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  const docentesDoPeriodo = vinculosDocente.filter((vinculo) => vinculo.periodoLetivoId === periodoId);

  function abrirNovo(novoModo: Modo) {
    setModo(novoModo);
    setCursoId("");
    setPessoaId("");
    setErro(null);
  }

  function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (cursoId === "" || pessoaId === "") return;
    startTransition(async () => {
      const resultado =
        modo === "docente"
          ? await acaoVincularDocente({ docenteId: Number(pessoaId), cursoId: Number(cursoId), periodoLetivoId: periodoId! })
          : await acaoVincularCoordenador({ coordenadorId: Number(pessoaId), cursoId: Number(cursoId) });
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      setModo(null);
      router.refresh();
    });
  }

  function remover(tipoVinculo: Modo, id: number, rotulo: string) {
    if (!window.confirm(`Remover o vínculo de ${rotulo}?`)) return;
    startTransition(async () => {
      await (tipoVinculo === "docente" ? acaoDesvincularDocente(id) : acaoDesvincularCoordenador(id));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoAdmin
        titulo="Vínculos"
        subtitulo={
          <p className="text-[15px] text-tinta-suave">
            Quem dá aula em qual curso, por período, e quem coordena cada curso.
          </p>
        }
      />

      {periodos.length === 0 ? (
        <p className="rounded-md border border-borda bg-superficie px-4 py-3 text-[15px] text-tinta-suave">
          Nenhum período letivo cadastrado.{" "}
          <Link href="/admin/periodos" className="font-medium text-azul-interativo hover:underline">
            Cadastre um período
          </Link>{" "}
          antes de vincular docentes a cursos.
        </p>
      ) : (
        <section className="flex flex-col gap-4">
          <CabecalhoAdmin
            nivel={2}
            titulo="Docentes por curso"
            subtitulo={
              <label htmlFor="periodo-vinculos" className="flex items-center gap-2 text-[13px] text-tinta-suave">
                Período
                <select
                  id="periodo-vinculos"
                  value={periodoId ?? ""}
                  onChange={(evento) => setPeriodoId(Number(evento.target.value))}
                  className="min-h-10 rounded-md border border-borda bg-superficie px-2.5 font-mono text-[13px] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
                >
                  {periodos.map((periodo) => (
                    <option key={periodo.id} value={periodo.id}>
                      {periodo.rotulo}
                    </option>
                  ))}
                </select>
              </label>
            }
            acao={
              <BotaoPrimario onClick={() => abrirNovo("docente")} icone>
                Vincular docente
              </BotaoPrimario>
            }
          />

          <TabelaAdmin minWidthPx={480}>
            <thead>
              <tr className="border-b border-borda text-[13px] text-tinta-suave">
                <th scope="col" className="px-4 py-2.5 font-medium">Curso</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Docente</th>
                <th scope="col" className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {docentesDoPeriodo.length === 0 && (
                <LinhaVazia colSpan={3}>Nenhum docente vinculado neste período.</LinhaVazia>
              )}
              {docentesDoPeriodo.map((vinculo) => (
                <tr key={vinculo.id} className="border-b border-[#f0f3f6] last:border-0">
                  <td className="px-4 py-3">{vinculo.cursoNome}</td>
                  <td className="px-4 py-3">{vinculo.docenteNome}</td>
                  <td className="px-4 py-3 text-right">
                    <LinkAcaoTabela
                      cor="devolvido"
                      onClick={() => remover("docente", vinculo.id, `${vinculo.docenteNome} em ${vinculo.cursoNome}`)}
                    >
                      Remover
                    </LinkAcaoTabela>
                  </td>
                </tr>
              ))}
            </tbody>
          </TabelaAdmin>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <CabecalhoAdmin
          nivel={2}
          titulo="Coordenadores por curso"
          acao={
            <BotaoPrimario onClick={() => abrirNovo("coordenador")} icone>
              Vincular coordenador
            </BotaoPrimario>
          }
        />

        <TabelaAdmin minWidthPx={480}>
          <thead>
            <tr className="border-b border-borda text-[13px] text-tinta-suave">
              <th scope="col" className="px-4 py-2.5 font-medium">Curso</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Coordenador</th>
              <th scope="col" className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {vinculosCoordenador.length === 0 && (
              <LinhaVazia colSpan={3}>Nenhum coordenador vinculado.</LinhaVazia>
            )}
            {vinculosCoordenador.map((vinculo) => (
              <tr key={vinculo.id} className="border-b border-[#f0f3f6] last:border-0">
                <td className="px-4 py-3">{vinculo.cursoNome}</td>
                <td className="px-4 py-3">{vinculo.coordenadorNome}</td>
                <td className="px-4 py-3 text-right">
                  <LinkAcaoTabela
                    cor="devolvido"
                    onClick={() =>
                      remover("coordenador", vinculo.id, `${vinculo.coordenadorNome} em ${vinculo.cursoNome}`)
                    }
                  >
                    Remover
                  </LinkAcaoTabela>
                </td>
              </tr>
            ))}
          </tbody>
        </TabelaAdmin>
      </section>

      <Modal
        aberto={modo !== null}
        eyebrow="ADMINISTRAÇÃO · VÍNCULOS"
        titulo={modo === "docente" ? "Vincular docente a um curso" : "Vincular coordenador a um curso"}
        descricao={
          modo === "docente"
            ? `Vale para o período ${periodos.find((p) => p.id === periodoId)?.rotulo ?? ""}.`
            : "O coordenador cadastrado primeiro para o curso é quem recebe os relatórios para avaliação."
        }
        onFechar={() => setModo(null)}
        rodape={
          <>
            <BotaoSecundario onClick={() => setModo(null)}>Cancelar</BotaoSecundario>
            <BotaoPrimario type="submit" form="form-vinculo" disabled={pendente}>
              {pendente ? "Salvando…" : "Vincular"}
            </BotaoPrimario>
          </>
        }
      >
        <form id="form-vinculo" onSubmit={salvar} className="flex flex-col gap-4">
          {erro && <MensagemErro>{erro}</MensagemErro>}
          <Campo rotulo="Curso" htmlFor="curso-vinculo">
            <select
              id="curso-vinculo"
              value={cursoId}
              onChange={(evento) => setCursoId(evento.target.value === "" ? "" : Number(evento.target.value))}
              required
              className={classeCampoSelect}
            >
              <option value="">— selecione —</option>
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  {curso.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo={modo === "docente" ? "Docente" : "Coordenador"} htmlFor="pessoa-vinculo">
            <select
              id="pessoa-vinculo"
              value={pessoaId}
              onChange={(evento) => setPessoaId(evento.target.value === "" ? "" : Number(evento.target.value))}
              required
              className={classeCampoSelect}
            >
              <option value="">— selecione —</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </option>
              ))}
            </select>
          </Campo>
        </form>
      </Modal>
    </div>
  );
}
