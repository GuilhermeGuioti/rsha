"use client";

import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { BotaoPrimario } from "../../../components/BotaoPrimario";
import { Campo, classeCampo } from "../../../components/Campo";
import { MensagemErro } from "../../../components/MensagemErro";
import { Pill } from "../../../components/Pill";
import { SeletorArquivo } from "../../../components/SeletorArquivo";
import { TAMANHO_MAXIMO_PDF } from "../../../lib/autenticidade";
import { codigoRelatorio, formatarDataHora, formatarHoras } from "../../../lib/formato";
import type { Resultado } from "../../../lib/tipos";
import { acaoValidarDocumento, type ResultadoValidacao } from "./acoes";

function Linha({ rotulo, mono, children }: { rotulo: string; mono?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="text-[13px] font-medium text-tinta-suave sm:w-36 sm:flex-none">{rotulo}</dt>
      <dd className={`text-[15px] text-tinta ${mono ? "font-mono font-medium tabular-nums" : ""}`}>{children}</dd>
    </div>
  );
}

// PDF anexado e código digitado são caminhos alternativos: escolher um limpa o
// outro, para nunca ficar dúbio qual dos dois foi conferido.
export function FormularioValidacao() {
  const idCodigo = useId();
  const idDica = useId();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoValidacao | null>(null);
  const [pendente, startTransition] = useTransition();

  function selecionar(selecionado: File | null) {
    setArquivo(selecionado);
    if (selecionado) setCodigo("");
    setErro(null);
    setResultado(null);
  }

  function digitar(valor: string) {
    setCodigo(valor);
    if (valor) setArquivo(null);
    setErro(null);
    setResultado(null);
  }

  function validar(evento: FormEvent) {
    evento.preventDefault();
    if (arquivo && arquivo.size > TAMANHO_MAXIMO_PDF) {
      setErro("O arquivo passa de 1 MB. Digite o código impresso no documento.");
      return;
    }
    const formulario = new FormData();
    if (arquivo) {
      formulario.set("arquivo", arquivo);
    } else {
      formulario.set("codigo", codigo);
    }
    setErro(null);
    setResultado(null);
    startTransition(async () => {
      let retorno: Resultado<ResultadoValidacao>;
      try {
        retorno = await acaoValidarDocumento(formulario);
      } catch {
        // Arquivo alterado no disco depois de selecionado não pode mais ser lido.
        setArquivo(null);
        setErro("Não foi possível ler o arquivo. Selecione-o de novo.");
        return;
      }
      if (!retorno.ok) {
        setErro(retorno.erro);
        return;
      }
      setResultado(retorno.dados);
    });
  }

  const documento = resultado?.documento;

  return (
    <div className="mt-8 flex flex-col gap-6">
      <form onSubmit={validar} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-tinta-suave">PDF do relatório</span>
          <SeletorArquivo
            rotulo="Selecionar PDF"
            accept=".pdf,application/pdf"
            arquivo={arquivo}
            onSelecionar={selecionar}
          />
        </div>

        <div className="flex items-center gap-3 text-[13px] font-medium text-tinta-suave">
          <span aria-hidden className="h-px flex-1 bg-borda" />
          ou
          <span aria-hidden className="h-px flex-1 bg-borda" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Campo rotulo="Código de autenticidade" htmlFor={idCodigo}>
            <input
              id={idCodigo}
              value={codigo}
              onChange={(evento) => digitar(evento.target.value)}
              aria-describedby={idDica}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={64}
              className={`${classeCampo} font-mono uppercase tracking-[0.08em]`}
            />
          </Campo>
          <p id={idDica} className="text-[13px] leading-relaxed text-tinta-suave">
            Fica no quadro “Código de autenticidade” e no rodapé de cada página, em cinco grupos de quatro
            caracteres.
          </p>
        </div>

        <div>
          <BotaoPrimario type="submit" disabled={pendente || (!arquivo && !codigo.trim())}>
            {pendente ? "Validando…" : "Validar documento"}
          </BotaoPrimario>
        </div>
      </form>

      {erro && <MensagemErro>{erro}</MensagemErro>}

      <div aria-live="polite">
        {resultado && documento && (
          <section className="rounded-md border border-borda border-t-4 border-t-estado-aprovado px-5 py-4">
            <Pill cor="aprovado" forma="circulo">
              Documento autêntico
            </Pill>
            <p className="mt-3 text-[15px] leading-relaxed text-tinta">
              O código <span className="font-mono font-medium">{resultado.codigo}</span> é de um relatório aprovado no
              SRHA. Confira se os dados abaixo são os mesmos do documento em mãos: qualquer diferença indica que ele
              foi alterado.
            </p>
            <dl className="mt-3 divide-y divide-borda">
              <Linha rotulo="Relatório" mono>
                {codigoRelatorio(documento.ano, documento.semestre, documento.id)}
              </Linha>
              <Linha rotulo="Docente">{documento.docente}</Linha>
              <Linha rotulo="Curso">{documento.curso}</Linha>
              <Linha rotulo="Período letivo">
                {documento.semestre}º semestre de {documento.ano}
              </Linha>
              <Linha rotulo="Total de horas" mono>
                {formatarHoras(documento.cargaHorariaTotal)} h
              </Linha>
              <Linha rotulo="Aprovado por">{documento.aprovadoPor}</Linha>
              <Linha rotulo="Aprovado em" mono>
                {formatarDataHora(documento.aprovadoEm)}
              </Linha>
            </dl>
          </section>
        )}

        {resultado && !documento && (
          <section className="rounded-md border border-borda border-t-4 border-t-estado-devolvido px-5 py-4">
            <Pill cor="devolvido" forma="triangulo">
              Documento não reconhecido
            </Pill>
            <p className="mt-3 text-[15px] leading-relaxed text-tinta">
              O código <span className="font-mono font-medium">{resultado.codigo}</span> não é de
              nenhum relatório aprovado no SRHA. Confira a digitação; se estiver igual ao impresso, o documento não é
              autêntico.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
