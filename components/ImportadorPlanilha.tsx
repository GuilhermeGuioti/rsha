"use client";

import { useId, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { Pill } from "./Pill";
import { BotaoPrimario } from "./BotaoPrimario";
import { BotaoSecundario, classeBotaoSecundario } from "./BotaoSecundario";
import { MensagemErro } from "./MensagemErro";
import {
  TAMANHO_MAXIMO_PLANILHA,
  gerarModeloCsv,
  type ModeloImportacao,
  type ResultadoImportacao,
} from "../lib/importacao";
import type { Resultado } from "../lib/tipos";

type ImportadorPlanilhaProps = {
  modelo: ModeloImportacao;
  eyebrow: string;
  titulo: string;
  descricao?: string;
  // Tela com dois importadores (vínculos): diferencia os botões para leitor de tela.
  complementoAcessivel?: string;
  acao: (formulario: FormData) => Promise<Resultado<ResultadoImportacao>>;
};

function plural(quantidade: number, singular: string, varios: string): string {
  return quantidade === 1 ? singular : varios;
}

function resumoSucesso(importados: number, jaExistiam: number): string {
  const novos =
    importados === 0
      ? "Nenhum cadastro novo."
      : `${importados} ${plural(importados, "cadastro importado.", "cadastros importados.")}`;
  if (jaExistiam === 0) return novos;
  return `${novos} ${jaExistiam} ${plural(
    jaExistiam,
    "já estava cadastrado e não foi alterado.",
    "já estavam cadastrados e não foram alterados.",
  )}`;
}

// Importação genérica de cadastro por planilha: quem usa só troca o modelo
// (colunas) e a Server Action. O modelo é gerado aqui mesmo a partir das
// colunas — é um cabeçalho fixo, não dado do banco, e assim nunca diverge do
// que o servidor espera ler.
export function ImportadorPlanilha({
  modelo,
  eyebrow,
  titulo,
  descricao,
  complementoAcessivel,
  acao,
}: ImportadorPlanilhaProps) {
  const router = useRouter();
  const idFormulario = useId();
  const idArquivo = useId();
  const [aberto, setAberto] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [pendente, startTransition] = useTransition();

  const concluido = resultado?.gravado === true;

  function abrir() {
    setArquivo(null);
    setErro(null);
    setResultado(null);
    setAberto(true);
  }

  function baixarModelo() {
    const url = URL.createObjectURL(new Blob([gerarModeloCsv(modelo)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = modelo.nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  }

  function selecionar(evento: ChangeEvent<HTMLInputElement>) {
    setArquivo(evento.target.files?.[0] ?? null);
    setErro(null);
    setResultado(null);
    // Sem isto, escolher de novo o mesmo arquivo depois de corrigi-lo não
    // dispara onChange.
    evento.target.value = "";
  }

  function importar(evento: FormEvent) {
    evento.preventDefault();
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO_PLANILHA) {
      setErro("A planilha passa de 1 MB.");
      return;
    }
    setErro(null);
    setResultado(null);
    const formulario = new FormData();
    formulario.set("arquivo", arquivo);
    startTransition(async () => {
      let retorno: Resultado<ResultadoImportacao>;
      try {
        retorno = await acao(formulario);
      } catch {
        // Arquivo alterado no disco depois de selecionado não pode mais ser lido.
        setArquivo(null);
        setErro("Não foi possível ler a planilha. Selecione o arquivo de novo.");
        return;
      }
      if (!retorno.ok) {
        setErro(retorno.erro);
        return;
      }
      setResultado(retorno.dados);
      if (retorno.dados.gravado) {
        router.refresh();
      } else {
        // A correção é feita na planilha: obriga a selecioná-la de novo.
        setArquivo(null);
      }
    });
  }

  return (
    <>
      <BotaoSecundario onClick={abrir}>
        Importar planilha
        {complementoAcessivel && <span className="sr-only"> {complementoAcessivel}</span>}
      </BotaoSecundario>

      <Modal
        aberto={aberto}
        eyebrow={eyebrow}
        titulo={titulo}
        descricao={descricao}
        onFechar={() => setAberto(false)}
        rodape={
          <>
            <BotaoSecundario onClick={() => setAberto(false)}>{concluido ? "Fechar" : "Cancelar"}</BotaoSecundario>
            {!concluido && (
              <BotaoPrimario type="submit" form={idFormulario} disabled={!arquivo || pendente}>
                {pendente ? "Importando…" : "Importar"}
              </BotaoPrimario>
            )}
          </>
        }
      >
        <form id={idFormulario} onSubmit={importar} className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h3 className="text-[15px] font-medium text-tinta">1. Baixe o modelo e preencha uma linha por cadastro</h3>
            <ul className="divide-y divide-borda rounded-md border border-borda">
              {modelo.colunas.map((coluna) => (
                <li key={coluna.chave} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2">
                  <span className="text-[15px] font-medium text-tinta">
                    {coluna.rotulo}
                    <span className="font-normal text-tinta-suave">
                      {" "}
                      · {coluna.obrigatoria ? "obrigatória" : "opcional"}
                    </span>
                  </span>
                  <span className="font-mono text-[13px] text-tinta-suave">{coluna.exemplo}</span>
                </li>
              ))}
            </ul>
            <div>
              <BotaoSecundario onClick={baixarModelo}>Baixar modelo (CSV)</BotaoSecundario>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-[15px] font-medium text-tinta">2. Envie a planilha preenchida</h3>
            <p className="text-[15px] leading-relaxed text-tinta-suave">
              Se alguma linha tiver erro, nada é importado — a lista mostra o que corrigir.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {/* Input nativo escondido atrás do rótulo com cara de botão; o anel de
                  foco vai no rótulo, já que é o input que recebe o foco. */}
              <label
                htmlFor={idArquivo}
                className={`${classeBotaoSecundario} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul-interativo`}
              >
                Selecionar planilha
                <input
                  id={idArquivo}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={selecionar}
                  className="sr-only"
                />
              </label>
              <span className="min-w-0 break-all font-mono text-[13px] text-tinta-suave">
                {arquivo ? arquivo.name : "Nenhum arquivo selecionado"}
              </span>
            </div>
          </section>

          {erro && <MensagemErro>{erro}</MensagemErro>}

          {resultado && !resultado.gravado && (
            <section role="alert" className="flex flex-col gap-2">
              <div>
                <Pill cor="devolvido" forma="triangulo">
                  Nada foi importado
                </Pill>
              </div>
              <p className="text-[15px] text-tinta">
                Corrija {plural(resultado.erros.length, "a linha abaixo", `as ${resultado.erros.length} linhas abaixo`)} na
                planilha e selecione-a de novo.
              </p>
              <ul
                tabIndex={0}
                aria-label="Linhas com erro"
                className="max-h-60 overflow-y-auto rounded-md border border-borda px-3 py-2 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
              >
                {resultado.erros.map((erroLinha, indice) => (
                  <li key={indice} className="py-1">
                    <span className="font-mono text-[13px] font-medium tabular-nums text-estado-devolvido">
                      Linha {erroLinha.linha}
                    </span>{" "}
                    {erroLinha.erro}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {resultado?.gravado && (
            <section role="status" className="flex flex-col gap-2">
              <div>
                <Pill cor="aprovado" forma="circulo">
                  Importação concluída
                </Pill>
              </div>
              <p className="text-[15px] text-tinta">{resumoSucesso(resultado.importados, resultado.jaExistiam)}</p>
            </section>
          )}
        </form>
      </Modal>
    </>
  );
}
