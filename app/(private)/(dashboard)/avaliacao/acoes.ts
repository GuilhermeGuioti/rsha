"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAcessoAoRelatorio } from "../../../../lib/auth/guards";
import { aprovar, devolver } from "../../../../lib/services/workflow";
import { paraResultadoErro, type Resultado } from "../../../../lib/tipos";

function revalidarRelatorio(relatorioId: number): void {
  revalidatePath("/avaliacao");
  revalidatePath(`/avaliacao/${relatorioId}`);
  // A situação também aparece na home e no formulário do próprio docente.
  revalidatePath("/");
  revalidatePath(`/relatorios/${relatorioId}`);
}

const SchemaAprovar = z.object({ relatorioId: z.number().int().positive() });

export async function acaoAprovar(relatorioId: number): Promise<Resultado<void>> {
  try {
    const sessao = await exigirAcessoAoRelatorio(relatorioId, "avaliar"); // 1. guard
    const dados = SchemaAprovar.parse({ relatorioId }); // 2. zod
    await aprovar(dados.relatorioId, sessao.usuarioId); // 3. serviço
    revalidarRelatorio(relatorioId); // 4. revalidação
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

const SchemaDevolver = z.object({
  relatorioId: z.number().int().positive(),
  justificativa: z.string().trim().min(1, "Justificativa é obrigatória para devolver o relatório."),
});

export async function acaoDevolver(relatorioId: number, justificativa: string): Promise<Resultado<void>> {
  try {
    const sessao = await exigirAcessoAoRelatorio(relatorioId, "avaliar");
    const dados = SchemaDevolver.parse({ relatorioId, justificativa });
    await devolver(dados.relatorioId, sessao.usuarioId, dados.justificativa);
    revalidarRelatorio(relatorioId);
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}
