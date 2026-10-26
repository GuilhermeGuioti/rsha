import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../db";
import { SituacaoRelatorio, TipoEvento } from "../../generated/prisma/client";

// Carimbo de autenticidade do PDF (decisão de 2026-10-26; ver CLAUDE.md).
//
// O código impresso é uma assinatura HMAC-SHA256 do relatório, feita com uma
// chave que só o servidor conhece. Nada é gravado: para conferir, o servidor
// recalcula a assinatura e compara. O código não prova o conteúdo do papel —
// ele destrava a conferência: a tela de validação mostra os dados oficiais e
// quem confere compara com o documento em mãos. O que o segredo impede é
// adivinhar o código de outro relatório e, na página pública, ler o de todos
// (o `REL-…` é sequencial).
//
// Formato: 12 bytes em base32 de Crockford, 20 caracteres em grupos de 4.
//   [versão da chave: 1 byte][relatorioId: 3 bytes][assinatura: 8 bytes]
// A versão viaja no código para a chave poder ser trocada sem invalidar o que
// já foi impresso. A assinatura cobre também o instante da aprovação, que o
// banco não deixa alterar: relatório com o mesmo id em outra base (homologação
// recriada, backup errado) não confere com o papel de um relatório antigo.

// Sem I, L, O e U: não se confundem com 1 e 0 na digitação.
const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TAMANHO_CODIGO = 20;
const BYTES_ASSINATURA = 8;
// 3 bytes de id: 16,7 milhões de relatórios, para ~1.000 por semestre.
const ID_MAXIMO = 0xffffff;
const DOMINIO = Buffer.from("SRHA:autenticidade:");

// Marca o código nos metadados do PDF (campo Keywords), que o react-pdf grava
// como texto puro — é dali que o arquivo anexado é lido, sem biblioteca de PDF.
export const MARCADOR_PDF = "SRHA-AUTENTICIDADE:";

type Chave = { versao: number; segredo: Buffer };

// CHAVES_CARIMBO="1:<base64>,2:<base64>" — a de maior versão assina, todas
// conferem. Versão antiga nunca é removida: removê-la invalida todo papel
// impresso com ela, e a retenção é de cinco anos (RNF09).
function lerChaves(): Chave[] {
  const bruto = process.env.CHAVES_CARIMBO?.trim();
  if (!bruto) {
    throw new Error("CHAVES_CARIMBO não configurada: sem ela o código de autenticidade não é emitido nem conferido.");
  }

  const chaves = bruto.split(",").map((parte): Chave => {
    const [versaoTexto, segredoTexto = ""] = parte.trim().split(":");
    const versao = Number(versaoTexto);
    if (!Number.isInteger(versao) || versao < 1 || versao > 255) {
      throw new Error(`CHAVES_CARIMBO: versão "${versaoTexto}" inválida — use um número de 1 a 255.`);
    }
    const segredo = Buffer.from(segredoTexto, "base64");
    if (segredo.length < 32) {
      throw new Error(`CHAVES_CARIMBO: a chave da versão ${versao} precisa de ao menos 32 bytes, em base64.`);
    }
    return { versao, segredo };
  });

  if (new Set(chaves.map((chave) => chave.versao)).size !== chaves.length) {
    throw new Error("CHAVES_CARIMBO: versão repetida.");
  }
  return chaves;
}

function assinar(segredo: Buffer, cabecalho: Buffer, aprovadoEm: Date): Buffer {
  const instante = Buffer.alloc(8);
  instante.writeBigInt64BE(BigInt(aprovadoEm.getTime()));
  return createHmac("sha256", segredo)
    .update(Buffer.concat([DOMINIO, cabecalho, instante]))
    .digest()
    .subarray(0, BYTES_ASSINATURA);
}

function cabecalho(versao: number, relatorioId: number): Buffer {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt8(versao, 0);
  bytes.writeUIntBE(relatorioId, 1, 3);
  return bytes;
}

function codificar(bytes: Buffer): string {
  let saida = "";
  let valor = 0;
  let bits = 0;
  for (const byte of bytes) {
    valor = ((valor << 8) | byte) & 0xfff;
    bits += 8;
    while (bits >= 5) {
      saida += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    saida += ALFABETO[(valor << (5 - bits)) & 31];
  }
  return saida;
}

function decodificar(texto: string): Buffer | null {
  const bytes: number[] = [];
  let valor = 0;
  let bits = 0;
  for (const caractere of texto) {
    const indice = ALFABETO.indexOf(caractere);
    if (indice < 0) {
      return null;
    }
    valor = ((valor << 5) | indice) & 0xfff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  // Os bits que sobram do último caractere são enchimento e precisam ser zero.
  if ((valor & ((1 << bits) - 1)) !== 0) {
    return null;
  }
  return Buffer.from(bytes);
}

// Tolera o que se espera de quem digita olhando o papel: minúsculas, espaços,
// hífens fora do lugar e O/I/L no lugar de 0/1.
function normalizar(texto: string): string {
  return texto.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
}

export function formatarCodigoAutenticidade(codigo: string): string {
  return normalizar(codigo).match(/.{1,4}/g)?.join("-") ?? "";
}

/**
 * Código de autenticidade impresso no PDF do relatório aprovado. Determinístico:
 * relatório aprovado não muda, então toda via sai com o mesmo código.
 */
export function gerarCodigoAutenticidade(relatorioId: number, aprovadoEm: Date): string {
  if (!Number.isInteger(relatorioId) || relatorioId < 1 || relatorioId > ID_MAXIMO) {
    throw new Error("Relatório fora da faixa do código de autenticidade.");
  }
  const atual = lerChaves().reduce((maior, chave) => (chave.versao > maior.versao ? chave : maior));
  const inicio = cabecalho(atual.versao, relatorioId);
  return formatarCodigoAutenticidade(codificar(Buffer.concat([inicio, assinar(atual.segredo, inicio, aprovadoEm)])));
}

/** Código gravado nos metadados do PDF emitido pelo SRHA, ou null se não houver. */
export function extrairCodigoDoPdf(bytes: Uint8Array): string | null {
  const texto = Buffer.from(bytes).toString("latin1");
  if (!texto.startsWith("%PDF-")) {
    return null;
  }
  const achado = texto.match(new RegExp(`${MARCADOR_PDF}([0-9A-Z]{4}(?:-[0-9A-Z]{4}){4})`));
  return achado?.[1] ?? null;
}

export type DocumentoAutentico = {
  id: number;
  ano: number;
  semestre: number;
  curso: string;
  docente: string;
  cargaHorariaTotal: number;
  aprovadoPor: string;
  aprovadoEm: Date;
};

/**
 * Confere o código de autenticidade. Devolve o resumo oficial do relatório —
 * só o que a página pública mostra: sem e-mail, itens nem trilha (LGPD) — ou
 * null quando o código não é de um relatório aprovado pelo SRHA.
 *
 * Todo motivo de recusa devolve o mesmo null — dizer qual parte falhou ajudaria
 * quem tenta forjar um código.
 */
export async function conferirCodigoAutenticidade(codigo: string): Promise<DocumentoAutentico | null> {
  const limpo = normalizar(codigo);
  if (limpo.length !== TAMANHO_CODIGO) {
    return null;
  }
  const bytes = decodificar(limpo);
  if (!bytes) {
    return null;
  }

  const versao = bytes.readUInt8(0);
  const relatorioId = bytes.readUIntBE(1, 3);
  const assinatura = bytes.subarray(4);

  const chave = lerChaves().find((candidata) => candidata.versao === versao);
  if (!chave || relatorioId === 0) {
    return null;
  }

  const relatorio = await prisma.relatorio.findUnique({
    where: { id: relatorioId },
    include: {
      docente: true,
      curso: true,
      periodo: true,
      // Aprovado é terminal: há no máximo um evento de aprovação.
      eventos: { where: { tipo: TipoEvento.APROVACAO }, include: { usuario: true } },
    },
  });
  const aprovacao = relatorio?.eventos[0];
  if (!relatorio || relatorio.situacao !== SituacaoRelatorio.APROVADO || !aprovacao) {
    return null;
  }

  const esperada = assinar(chave.segredo, bytes.subarray(0, 4), aprovacao.ocorridoEm);
  if (!timingSafeEqual(assinatura, esperada)) {
    return null;
  }

  return {
    id: relatorio.id,
    ano: relatorio.periodo.ano,
    semestre: relatorio.periodo.semestre,
    curso: relatorio.curso.nome,
    docente: relatorio.docente.nome,
    cargaHorariaTotal: relatorio.cargaHorariaTotal.toNumber(),
    aprovadoPor: aprovacao.usuario.nome,
    aprovadoEm: aprovacao.ocorridoEm,
  };
}
