"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { criarCurso, atualizarCurso } from "../../../../../lib/services/cursos";
import { SchemaArquivoPlanilha, type ResultadoImportacao } from "../../../../../lib/importacao";
import { importarCursos } from "../../../../../lib/services/importacao";
import { paraResultadoErro, type Resultado } from "../../../../../lib/tipos";

const SchemaId = z.number().int().positive();

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
    const idValidado = SchemaId.parse(id);
    const validado = SchemaCurso.parse(dados);
    await atualizarCurso(idValidado, validado);
    revalidatePath("/admin/cursos");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

export async function acaoImportarCursos(formulario: FormData): Promise<Resultado<ResultadoImportacao>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA);
    const arquivo = SchemaArquivoPlanilha.parse(formulario.get("arquivo"));
    const resultado = await importarCursos(new Uint8Array(await arquivo.arrayBuffer()));
    revalidatePath("/admin/cursos");
    return { ok: true, dados: resultado };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}
