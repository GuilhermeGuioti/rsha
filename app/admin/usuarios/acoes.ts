"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPerfil } from "../../../lib/auth/guards";
import { Perfil } from "../../generated/prisma/client";
import { criarUsuario, atualizarUsuario } from "../../../lib/services/usuarios";
import { paraResultadoErro, type Resultado } from "../../../lib/tipos";

const SchemaUsuario = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  email: z.string().trim().pipe(z.email("Informe um e-mail válido.")),
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
    const validado = SchemaUsuario.parse(dados);
    await atualizarUsuario(id, validado);
    revalidatePath("/admin/usuarios");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}
