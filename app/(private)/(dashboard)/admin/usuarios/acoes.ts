"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { criarUsuario, atualizarUsuario } from "../../../../../lib/services/usuarios";
import { SchemaArquivoPlanilha, type ResultadoImportacao } from "../../../../../lib/importacao";
import { importarUsuarios } from "../../../../../lib/services/importacao";
import { paraResultadoErro, type Resultado } from "../../../../../lib/tipos";

const SchemaId = z.number().int().positive();

const SchemaUsuario = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  // Minúsculo antes de gravar: o @unique do banco diferencia caixa, e o mesmo
  // endereço digitado de dois jeitos viraria duas pessoas — além de não casar
  // com o e-mail que o login devolve.
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")),
  ativo: z.boolean(),
  secretaria: z.boolean(),
});

export type DadosFormularioUsuario = z.infer<typeof SchemaUsuario>;

export async function acaoCriarUsuario(
  dados: DadosFormularioUsuario,
): Promise<Resultado<{ id: number }>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA); // 1. guard
    const validado = SchemaUsuario.parse(dados); // 2. zod
    const id = await criarUsuario(validado); // 3. serviço
    revalidatePath("/admin/usuarios"); // 4. revalidação
    return { ok: true, dados: { id } };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

export async function acaoAtualizarUsuario(
  id: number,
  dados: DadosFormularioUsuario,
): Promise<Resultado<void>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA);
    const idValidado = SchemaId.parse(id);
    const validado = SchemaUsuario.parse(dados);
    await atualizarUsuario(idValidado, validado);
    revalidatePath("/admin/usuarios");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

export async function acaoImportarUsuarios(formulario: FormData): Promise<Resultado<ResultadoImportacao>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA);
    const arquivo = SchemaArquivoPlanilha.parse(formulario.get("arquivo"));
    const resultado = await importarUsuarios(new Uint8Array(await arquivo.arrayBuffer()));
    revalidatePath("/admin/usuarios");
    return { ok: true, dados: resultado };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}
