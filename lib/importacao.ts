import Papa from "papaparse";
import { z } from "zod";

// Importação de cadastro por planilha CSV — a parte que não depende de banco,
// compartilhada entre o modal (gera o modelo e lista as colunas) e o serviço
// (lê o arquivo enviado). Cada cadastro é só uma entrada em MODELOS_IMPORTACAO;
// o que fazer com as linhas lidas mora em lib/services/importacao.ts.

export type ColunaImportacao = {
  chave: string;
  rotulo: string;
  // Obrigatória: precisa estar no cabeçalho e preenchida em toda linha.
  // Opcional: pode faltar no cabeçalho ou ficar vazia.
  obrigatoria: boolean;
  exemplo: string;
};

export type ModeloImportacao = {
  nomeArquivo: string;
  colunas: ColunaImportacao[];
};

export const MODELOS_IMPORTACAO = {
  usuarios: {
    nomeArquivo: "modelo-usuarios.csv",
    colunas: [
      { chave: "nome", rotulo: "Nome", obrigatoria: true, exemplo: "Maria da Silva" },
      { chave: "email", rotulo: "E-mail", obrigatoria: true, exemplo: "maria.silva@instituicao.edu.br" },
      { chave: "secretaria", rotulo: "Secretaria", obrigatoria: false, exemplo: "Sim ou Não (vazio é Não)" },
    ],
  },
  cursos: {
    nomeArquivo: "modelo-cursos.csv",
    colunas: [{ chave: "nome", rotulo: "Nome", obrigatoria: true, exemplo: "Engenharia Civil" }],
  },
  tiposAtividade: {
    nomeArquivo: "modelo-tipos-atividade.csv",
    colunas: [{ chave: "descricao", rotulo: "Descrição", obrigatoria: true, exemplo: "Orientação de TCC" }],
  },
  vinculosDocente: {
    nomeArquivo: "modelo-vinculos-docente.csv",
    colunas: [
      { chave: "email", rotulo: "E-mail do docente", obrigatoria: true, exemplo: "maria.silva@instituicao.edu.br" },
      { chave: "curso", rotulo: "Curso", obrigatoria: true, exemplo: "Engenharia Civil" },
      { chave: "ano", rotulo: "Ano", obrigatoria: true, exemplo: "2026" },
      { chave: "semestre", rotulo: "Semestre", obrigatoria: true, exemplo: "1 ou 2" },
    ],
  },
  vinculosCoordenador: {
    nomeArquivo: "modelo-vinculos-coordenador.csv",
    colunas: [
      { chave: "email", rotulo: "E-mail do coordenador", obrigatoria: true, exemplo: "joao.souza@instituicao.edu.br" },
      { chave: "curso", rotulo: "Curso", obrigatoria: true, exemplo: "Engenharia Civil" },
    ],
  },
} satisfies Record<string, ModeloImportacao>;

export type ErroLinha = { linha: number; erro: string };

// Tudo ou nada: com qualquer linha errada nada é gravado, e a planilha volta
// inteira para correção.
export type ResultadoImportacao =
  | { gravado: true; importados: number; jaExistiam: number }
  | { gravado: false; erros: ErroLinha[] };

// Folga grande: 1 MB de CSV são dezenas de milhares de linhas. É também o
// limite padrão do corpo de Server Action no Next — acima disso o próprio
// framework recusa, com mensagem que a secretaria não entenderia.
export const TAMANHO_MAXIMO_PLANILHA = 1024 * 1024;

export const SchemaArquivoPlanilha = z
  // Blob, não File: o File que chega na Server Action depende da implementação
  // de FormData do runtime, e só o conteúdo importa aqui.
  .instanceof(Blob, { message: "Selecione a planilha." })
  .refine((arquivo) => arquivo.size > 0, "A planilha está vazia.")
  .refine((arquivo) => arquivo.size <= TAMANHO_MAXIMO_PLANILHA, "A planilha passa de 1 MB.");

// Só o cabeçalho, sem linha de exemplo: exemplo esquecido na planilha viraria
// cadastro de verdade. Os exemplos aparecem no modal. Mesmo formato da
// extração (";", BOM, CRLF), que o Excel em português abre direto em colunas.
export function gerarModeloCsv(modelo: ModeloImportacao): string {
  const csv = Papa.unparse([modelo.colunas.map((coluna) => coluna.rotulo)], { delimiter: ";", newline: "\r\n" });
  return `﻿${csv}\r\n`;
}

// O modelo sai em UTF-8, mas planilha montada do zero e salva como "CSV" no
// Excel em português vem em Windows-1252 — lida como UTF-8, todo acento
// viraria "�". UTF-8 inválido é sinal de que não é UTF-8.
export function decodificarPlanilha(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

// "E-mail", "email" e "EMAIL " são a mesma coluna; "Descrição" e "Descricao" também.
function normalizarCabecalho(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Pelo cabeçalho, que nunca tem vírgula nem ponto e vírgula dentro do rótulo.
// Adivinhar pelo conteúdo erra na planilha de uma coluna só: "Administração,
// Gestão" sem aspas num arquivo com ";" viraria duas células.
function detectarSeparador(texto: string): string {
  const cabecalho = texto.split(/\r?\n/, 1)[0] ?? "";
  if (cabecalho.includes(";")) return ";";
  if (cabecalho.includes("\t")) return "\t";
  if (cabecalho.includes(",")) return ",";
  return ";";
}

export type LinhaPlanilha = { linha: number; valores: Record<string, string> };

/**
 * Lê o CSV e devolve as linhas preenchidas com o número da linha no arquivo
 * (cabeçalho é a linha 1), já com os valores sem espaços nas pontas.
 * Problema que impede ler a planilha inteira (coluna faltando, nenhuma linha)
 * é lançado como exceção; linha com campo obrigatório vazio vira erro e fica
 * de fora das linhas devolvidas.
 */
export function lerPlanilha(
  texto: string,
  modelo: ModeloImportacao,
): { linhas: LinhaPlanilha[]; erros: ErroLinha[] } {
  const semBom = texto.replace(/^﻿/, "");
  const { data } = Papa.parse<string[]>(semBom, { delimiter: detectarSeparador(semBom), skipEmptyLines: false });

  // Excel deixa linhas só com ";;;" no fim; contam na numeração, mas não são dados.
  const preenchidas = data
    .map((celulas, indice) => ({ celulas, linha: indice + 1 }))
    .filter(({ celulas }) => celulas.some((celula) => celula.trim() !== ""));

  const [cabecalho, ...dados] = preenchidas;
  if (!cabecalho) {
    throw new Error("A planilha está vazia.");
  }

  const rotulos = cabecalho.celulas.map(normalizarCabecalho);
  const posicoes = modelo.colunas.map((coluna) => ({
    coluna,
    indice: rotulos.indexOf(normalizarCabecalho(coluna.rotulo)),
  }));
  const faltando = posicoes.filter(({ coluna, indice }) => coluna.obrigatoria && indice === -1);
  if (faltando.length > 0) {
    throw new Error(
      `Coluna ausente no cabeçalho: ${faltando.map(({ coluna }) => coluna.rotulo).join(", ")}. Use o modelo.`,
    );
  }
  if (dados.length === 0) {
    throw new Error("A planilha não tem nenhuma linha abaixo do cabeçalho.");
  }

  const linhas: LinhaPlanilha[] = [];
  const erros: ErroLinha[] = [];
  for (const { celulas, linha } of dados) {
    const valores: Record<string, string> = {};
    for (const { coluna, indice } of posicoes) {
      valores[coluna.chave] = indice === -1 ? "" : (celulas[indice] ?? "").trim();
    }
    const vazias = modelo.colunas.filter((coluna) => coluna.obrigatoria && valores[coluna.chave] === "");
    if (vazias.length > 0) {
      erros.push({ linha, erro: `Não preenchido: ${vazias.map((coluna) => coluna.rotulo).join(", ")}.` });
    } else {
      linhas.push({ linha, valores });
    }
  }

  return { linhas, erros };
}
