import { z } from "zod";

export type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; campo?: string };

// Converte a exceção (guard, zod ou serviço) no formato único de retorno.
// Toda Server Action termina num catch que chama isto — nunca deixa o throw
// atravessar a fronteira servidor → cliente.
export function paraResultadoErro(erro: unknown): Resultado<never> {
  if (erro instanceof z.ZodError) {
    const problema = erro.issues[0];
    return { ok: false, erro: problema.message, campo: String(problema.path[0] ?? "") };
  }
  if (erro instanceof Error) {
    return { ok: false, erro: erro.message };
  }
  return { ok: false, erro: "Erro inesperado." };
}
