"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { criarPeriodo, atualizarPeriodo } from "../../../../../lib/services/periodos";
import { paraResultadoErro, type Resultado } from "../../../../../lib/tipos";

const SchemaPeriodo = z.object({
  ano: z.number().int().min(2000, "Informe um ano válido."),
  semestre: z.number().int().min(1, "Semestre deve ser 1 ou 2.").max(2, "Semestre deve ser 1 ou 2."),
  aberturaSubmissao: z.date(),
  encerramentoSubmissao: z.date(),
});

export type DadosFormularioPeriodo = z.infer<typeof SchemaPeriodo>;

export async function acaoCriarPeriodo(
  dados: DadosFormularioPeriodo,
): Promise<Resultado<{ id: number }>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA); // 1. guard
    const validado = SchemaPeriodo.parse(dados); // 2. zod
    const id = await criarPeriodo(validado); // 3. serviço
    revalidatePath("/admin/periodos"); // 4. revalidação
    return { ok: true, dados: { id } };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

export async function acaoAtualizarPeriodo(
  id: number,
  dados: DadosFormularioPeriodo,
): Promise<Resultado<void>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA);
    const validado = SchemaPeriodo.parse(dados);
    await atualizarPeriodo(id, validado);
    revalidatePath("/admin/periodos");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}
