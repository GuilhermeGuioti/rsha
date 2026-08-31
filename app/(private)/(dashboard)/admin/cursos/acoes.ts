"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { criarCurso, atualizarCurso } from "../../../../../lib/services/cursos";
import { paraResultadoErro, type Resultado } from "../../../../../lib/tipos";

const SchemaCurso = z.object({
  nome: z.string().trim().min(1, "Informe o nome do curso."),
  ativo: z.boolean(),
});

export type DadosFormularioCurso = z.infer<typeof SchemaCurso>;

export async function acaoCriarCurso(dados: DadosFormularioCurso): Promise<Resultado<{ id: number }>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA); // 1. guard
    const validado = SchemaCurso.parse(dados); // 2. zod
    const id = await criarCurso(validado); // 3. serviço
    revalidatePath("/admin/cursos"); // 4. revalidação
    return { ok: true, dados: { id } };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

export async function acaoAtualizarCurso(
  id: number,
  dados: DadosFormularioCurso,
): Promise<Resultado<void>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA);
    const validado = SchemaCurso.parse(dados);
    await atualizarCurso(id, validado);
    revalidatePath("/admin/cursos");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}
