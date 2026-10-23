"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { criarTipoAtividade, atualizarTipoAtividade } from "../../../../../lib/services/tipos-atividade";
import { SchemaArquivoPlanilha, type ResultadoImportacao } from "../../../../../lib/importacao";
import { importarTiposAtividade } from "../../../../../lib/services/importacao";
import { paraResultadoErro, type Resultado } from "../../../../../lib/tipos";

const SchemaId = z.number().int().positive();

const SchemaTipoAtividade = z.object({
  descricao: z.string().trim().min(1, "Informe a descrição do tipo de atividade."),
  ativo: z.boolean(),
});

export type DadosFormularioTipoAtividade = z.infer<typeof SchemaTipoAtividade>;

export async function acaoCriarTipoAtividade(
  dados: DadosFormularioTipoAtividade,
): Promise<Resultado<{ id: number }>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA); // 1. guard
    const validado = SchemaTipoAtividade.parse(dados); // 2. zod
    const id = await criarTipoAtividade(validado); // 3. serviço
    revalidatePath("/admin/tipos-atividade"); // 4. revalidação
    return { ok: true, dados: { id } };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

export async function acaoAtualizarTipoAtividade(
  id: number,
  dados: DadosFormularioTipoAtividade,
): Promise<Resultado<void>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA);
    const idValidado = SchemaId.parse(id);
    const validado = SchemaTipoAtividade.parse(dados);
    await atualizarTipoAtividade(idValidado, validado);
    revalidatePath("/admin/tipos-atividade");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

export async function acaoImportarTiposAtividade(formulario: FormData): Promise<Resultado<ResultadoImportacao>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA);
    const arquivo = SchemaArquivoPlanilha.parse(formulario.get("arquivo"));
    const resultado = await importarTiposAtividade(new Uint8Array(await arquivo.arrayBuffer()));
    revalidatePath("/admin/tipos-atividade");
    return { ok: true, dados: resultado };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}
