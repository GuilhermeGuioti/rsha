import { z } from "zod";

// Compartilhado entre a tela de validação e a Server Action — a regra do
// carimbo mora em lib/services/autenticidade.ts, que o navegador não importa.

// O PDF do SRHA tem algumas centenas de KB. 1 MB é também o limite padrão do
// corpo de Server Action no Next: acima disso o próprio framework recusa, com
// mensagem que quem valida não entenderia.
export const TAMANHO_MAXIMO_PDF = 1024 * 1024;

export const SchemaValidarDocumento = z
  .object({
    // Blob, não File: o File que chega na Server Action depende da
    // implementação de FormData do runtime, e só o conteúdo importa aqui.
    arquivo: z
      .instanceof(Blob)
      .refine((arquivo) => arquivo.size > 0, "O arquivo está vazio.")
      .refine((arquivo) => arquivo.size <= TAMANHO_MAXIMO_PDF, "O arquivo passa de 1 MB.")
      .optional(),
    codigo: z.string().trim().max(64, "O código de autenticidade tem 20 caracteres.").optional(),
  })
  .refine((dados) => dados.arquivo || dados.codigo, {
    message: "Anexe o PDF ou digite o código de autenticidade.",
    path: ["codigo"],
  });
