"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "../../../../../components/Modal";
import { BotaoPrimario } from "../../../../../components/BotaoPrimario";
import { BotaoSecundario } from "../../../../../components/BotaoSecundario";
import { Campo, classeCampoSelect } from "../../../../../components/Campo";
import { Tabela } from "../../../../../components/Tabela";
import { CabecalhoAdmin } from "../../../../../components/CabecalhoAdmin";
import { CampoBusca } from "../../../../../components/CampoBusca";
import { AcaoTabela } from "../../../../../components/AcaoTabela";
import { IconeRemover } from "../../../../../components/Icones";
import { MensagemErro } from "../../../../../components/MensagemErro";
import { ImportadorPlanilha } from "../../../../../components/ImportadorPlanilha";
import { MODELOS_IMPORTACAO } from "../../../../../lib/importacao";
import { useBusca } from "../../../../../lib/hooks/useBusca";
import {
  acaoVincularDocente,
  acaoDesvincularDocente,
  acaoVincularCoordenador,
  acaoDesvincularCoordenador,
  acaoImportarVinculosDocente,
  acaoImportarVinculosCoordenador,
} from "./acoes";

type Periodo = { id: number; rotulo: string };
type Opcao = { id: number; nome: string };
type VinculoDocente = {
  id: number;
  periodoLetivoId: number;
  periodoRotulo: string;
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
  const [modo, setModo] = useState<Modo | null>(null);
  const [cursoId, setCursoId] = useState<number | "">("");
  const [pessoaId, setPessoaId] = useState<number | "">("");
  const [periodoId, setPeriodoId] = useState<number | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const buscaDocentes = useBusca();
  const buscaCoordenadores = useBusca();
  const [periodoFiltroId, setPeriodoFiltroId] = useState<number | "todos">("todos");

  const docentesFiltrados = vinculosDocente.filter(
    (vinculo) =>
      (periodoFiltroId === "todos" || vinculo.periodoLetivoId === periodoFiltroId) &&
      (vinculo.docenteNome.toLowerCase().includes(buscaDocentes.normalizado) ||
        vinculo.cursoNome.toLowerCase().includes(buscaDocentes.normalizado)),
  );

  const coordenadoresFiltrados = vinculosCoordenador.filter(
    (vinculo) =>
      vinculo.coordenadorNome.toLowerCase().includes(buscaCoordenadores.normalizado) ||
      vinculo.cursoNome.toLowerCase().includes(buscaCoordenadores.normalizado),
  );

  function abrirNovo(novoModo: Modo) {
    setModo(novoModo);
    setCursoId("");
    setPessoaId("");
    setPeriodoId(periodos[0]?.id ?? "");
    setErro(null);
  }

  function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (cursoId === "" || pessoaId === "") return;
    if (modo === "docente" && periodoId === "") return;
    startTransition(async () => {
      const resultado =
        modo === "docente"
          ? await acaoVincularDocente({ docenteId: Number(pessoaId), cursoId: Number(cursoId), periodoLetivoId: Number(periodoId) })
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
      const resultado = await (tipoVinculo === "docente" ? acaoDesvincularDocente(id) : acaoDesvincularCoordenador(id));
      if (!resultado.ok) {
        // Fora do modal não há onde pendurar MensagemErro — mesmo canal nativo
        // do confirm acima.
        window.alert(resultado.erro);
        return;
      }
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

      {periodos.length === 0 && (
        <p className="rounded-2xl border border-estado-aguardando-borda bg-estado-aguardando-suave px-5 py-4 text-[15px] text-tinta">
          Nenhum período letivo cadastrado.{" "}
          <Link href="/admin/periodos" className="font-medium text-azul-interativo hover:underline">
            Cadastre um período
          </Link>{" "}
          antes de vincular docentes a cursos.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {periodos.length > 0 && (
          <section className="flex flex-col gap-4">
            <CabecalhoAdmin
              nivel={2}
              titulo="Docentes por curso"
              acao={
                <>
                  <ImportadorPlanilha
                    modelo={MODELOS_IMPORTACAO.vinculosDocente}
                    eyebrow="ADMINISTRAÇÃO · VÍNCULOS"
                    titulo="Importar vínculos de docentes"
                    descricao="Um vínculo por linha. Docente, curso e período precisam estar cadastrados e ativos; vínculo que já existe é ignorado."
                    complementoAcessivel="de vínculos de docentes"
                    acao={acaoImportarVinculosDocente}
                  />
                  <BotaoPrimario onClick={() => abrirNovo("docente")} icone>
                    Vincular docente
                  </BotaoPrimario>
                </>
              }
            />

            <div className="flex flex-wrap gap-2">
              <CampoBusca
                id="busca-docentes"
                rotuloAcessivel="Buscar por nome do docente ou do curso"
                placeholder="Buscar por docente ou curso…"
                valor={buscaDocentes.valor}
                onChange={buscaDocentes.definir}
              />
              <label htmlFor="filtro-periodo-docentes" className="sr-only">
                Filtrar por período letivo
              </label>
              <select
                id="filtro-periodo-docentes"
                value={periodoFiltroId}
                onChange={(evento) =>
                  setPeriodoFiltroId(evento.target.value === "todos" ? "todos" : Number(evento.target.value))
                }
                className={`${classeCampoSelect} shadow-cartao`}
              >
                <option value="todos">Todos os períodos</option>
                {periodos.map((periodo) => (
                  <option key={periodo.id} value={periodo.id}>
                    {periodo.rotulo}
                  </option>
                ))}
              </select>
            </div>

            <Tabela<VinculoDocente>
              minWidthPx={0}
              linhas={docentesFiltrados}
              chave={(vinculo) => vinculo.id}
              vazio={
                buscaDocentes.normalizado || periodoFiltroId !== "todos"
                  ? "Nenhum vínculo encontrado."
                  : "Nenhum docente vinculado."
              }
              colunas={[
                { cabecalho: "Curso", largura: "38%", render: (vinculo) => vinculo.cursoNome },
                { cabecalho: "Docente", largura: "38%", render: (vinculo) => vinculo.docenteNome },
                {
                  cabecalho: "Período",
                  largura: "12%",
                  classeCelula: "font-mono text-[13px] tabular-nums text-tinta-suave",
                  render: (vinculo) => vinculo.periodoRotulo,
                },
                {
                  cabecalho: "",
                  alinhado: "direita",
                  largura: "12%",
                  render: (vinculo) => (
                    <AcaoTabela
                      cor="devolvido"
                      rotulo={`Remover vínculo de ${vinculo.docenteNome} em ${vinculo.cursoNome}`}
                      onClick={() => remover("docente", vinculo.id, `${vinculo.docenteNome} em ${vinculo.cursoNome}`)}
                    >
                      <IconeRemover className="h-[18px] w-[18px]" />
                    </AcaoTabela>
                  ),
                },
              ]}
            />
          </section>
        )}

        <section className="flex flex-col gap-4">
          <CabecalhoAdmin
            nivel={2}
            titulo="Coordenadores por curso"
            acao={
              <>
                <ImportadorPlanilha
                  modelo={MODELOS_IMPORTACAO.vinculosCoordenador}
                  eyebrow="ADMINISTRAÇÃO · VÍNCULOS"
                  titulo="Importar vínculos de coordenadores"
                  descricao="O primeiro coordenador ativo cadastrado para o curso recebe os relatórios para avaliação — as linhas são gravadas na ordem da planilha. Vínculo que já existe é ignorado."
                  complementoAcessivel="de vínculos de coordenadores"
                  acao={acaoImportarVinculosCoordenador}
                />
                <BotaoPrimario onClick={() => abrirNovo("coordenador")} icone>
                  Vincular coordenador
                </BotaoPrimario>
              </>
            }
          />

          <div className="flex gap-2">
            <CampoBusca
              id="busca-coordenadores"
              rotuloAcessivel="Buscar por nome do coordenador ou do curso"
              placeholder="Buscar por coordenador ou curso…"
              valor={buscaCoordenadores.valor}
              onChange={buscaCoordenadores.definir}
            />
          </div>

          <Tabela<VinculoCoordenador>
            minWidthPx={0}
            linhas={coordenadoresFiltrados}
            chave={(vinculo) => vinculo.id}
            vazio={
              buscaCoordenadores.normalizado ? "Nenhum vínculo encontrado." : "Nenhum coordenador vinculado."
            }
            colunas={[
              { cabecalho: "Curso", largura: "38%", render: (vinculo) => vinculo.cursoNome },
              { cabecalho: "Coordenador", largura: "38%", render: (vinculo) => vinculo.coordenadorNome },
              {
                cabecalho: "",
                alinhado: "direita",
                largura: "24%",
                render: (vinculo) => (
                  <AcaoTabela
                    cor="devolvido"
                    rotulo={`Remover vínculo de ${vinculo.coordenadorNome} em ${vinculo.cursoNome}`}
                    onClick={() =>
                      remover("coordenador", vinculo.id, `${vinculo.coordenadorNome} em ${vinculo.cursoNome}`)
                    }
                  >
                    <IconeRemover className="h-[18px] w-[18px]" />
                  </AcaoTabela>
                ),
              },
            ]}
          />
        </section>
      </div>

      <Modal
        aberto={modo !== null}
        eyebrow="ADMINISTRAÇÃO · VÍNCULOS"
        titulo={modo === "docente" ? "Vincular docente a um curso" : "Vincular coordenador a um curso"}
        descricao={
          modo === "coordenador"
            ? "O primeiro coordenador ativo cadastrado para o curso é quem recebe os relatórios para avaliação."
            : undefined
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
          {modo === "docente" && (
            <Campo rotulo="Período" htmlFor="periodo-vinculo">
              <select
                id="periodo-vinculo"
                value={periodoId}
                onChange={(evento) => setPeriodoId(evento.target.value === "" ? "" : Number(evento.target.value))}
                required
                className={classeCampoSelect}
              >
                <option value="">— selecione —</option>
                {periodos.map((periodo) => (
                  <option key={periodo.id} value={periodo.id}>
                    {periodo.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
          )}
        </form>
      </Modal>
    </div>
  );
}
