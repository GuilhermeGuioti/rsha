"use server";

import { SchemaValidarDocumento } from "../../../lib/autenticidade";
import {
  conferirCodigoAutenticidade,
  extrairCodigoDoPdf,
  formatarCodigoAutenticidade,
  type DocumentoAutentico,
} from "../../../lib/services/autenticidade";
import { paraResultadoErro, type Resultado } from "../../../lib/tipos";

export type ResultadoValidacao = {
  codigo: string;
  // null: o código não é de relatório aprovado pelo SRHA.
  documento: DocumentoAutentico | null;
};

// Sem guard, de propósito (decisão de 2026-10-26): quem recebe o papel — RH,
// setor externo — confere sem ter conta no SRHA. O que protege é o código ser
// impossível de adivinhar, e o retorno é só o resumo do relatório. Não altera
// dado, então não há revalidatePath.
export async function acaoValidarDocumento(formulario: FormData): Promise<Resultado<ResultadoValidacao>> {
  try {
    const dados = SchemaValidarDocumento.parse({
      arquivo: formulario.get("arquivo") ?? undefined,
      codigo: formulario.get("codigo") ?? undefined,
    });

    let codigo = dados.codigo ?? "";
    if (dados.arquivo) {
      const extraido = extrairCodigoDoPdf(new Uint8Array(await dados.arquivo.arrayBuffer()));
      if (!extraido) {
        return {
          ok: false,
          erro:
            "Não encontramos o código de autenticidade neste arquivo. Se o PDF foi digitalizado ou salvo de novo " +
            "por outro programa, digite o código impresso no documento.",
          campo: "arquivo",
        };
      }
      codigo = extraido;
    }

    const documento = await conferirCodigoAutenticidade(codigo);
    return { ok: true, dados: { codigo: formatarCodigoAutenticidade(codigo), documento } };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}
