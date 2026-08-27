"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import {
  vincularDocente,
  desvincularDocente,
  vincularCoordenador,
  desvincularCoordenador,
} from "../../../../../lib/services/vinculos";
import { paraResultadoErro, type Resultado } from "../../../../../lib/tipos";

const SchemaId = z.object({ id: z.number().int().positive() });

const SchemaVinculoDocente = z.object({
  docenteId: z.number().int().positive(),
  cursoId: z.number().int().positive(),
  periodoLetivoId: z.number().int().positive(),
});

export type DadosVinculoDocente = z.infer<typeof SchemaVinculoDocente>;

export async function acaoVincularDocente(dados: DadosVinculoDocente): Promise<Resultado<void>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA); // 1. guard
    const validado = SchemaVinculoDocente.parse(dados); // 2. zod
    await vincularDocente(validado.docenteId, validado.cursoId, validado.periodoLetivoId); // 3. serviço
    revalidatePath("/admin/vinculos"); // 4. revalidação
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

export async function acaoDesvincularDocente(id: number): Promise<Resultado<void>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA);
    const validado = SchemaId.parse({ id });
    await desvincularDocente(validado.id);
    revalidatePath("/admin/vinculos");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

const SchemaVinculoCoordenador = z.object({
  coordenadorId: z.number().int().positive(),
  cursoId: z.number().int().positive(),
});

export type DadosVinculoCoordenador = z.infer<typeof SchemaVinculoCoordenador>;

export async function acaoVincularCoordenador(dados: DadosVinculoCoordenador): Promise<Resultado<void>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA);
    const validado = SchemaVinculoCoordenador.parse(dados);
    await vincularCoordenador(validado.coordenadorId, validado.cursoId);
    revalidatePath("/admin/vinculos");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

export async function acaoDesvincularCoordenador(id: number): Promise<Resultado<void>> {
  try {
    await exigirPerfil(Perfil.SECRETARIA);
    const validado = SchemaId.parse({ id });
    await desvincularCoordenador(validado.id);
    revalidatePath("/admin/vinculos");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}
