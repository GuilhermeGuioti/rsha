"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSessao, exigirAcessoAoRelatorio } from "../../../lib/auth/guards";
import { obterOuCriarRascunho, submeter } from "../../../lib/services/workflow";
import { adicionarItem, removerItem, type DadosItem } from "../../../lib/services/itens";
import { DiaSemana } from "../../../generated/prisma/client";
import { paraResultadoErro, type Resultado } from "../../../lib/tipos";

const SchemaAbrirRelatorio = z.object({
  cursoId: z.number().int().positive(),
  periodoLetivoId: z.number().int().positive(),
});

export async function acaoAbrirRelatorio(
  cursoId: number,
  periodoLetivoId: number,
): Promise<Resultado<{ relatorioId: number }>> {
  try {
    const sessao = await exigirSessao(); // 1. guard
    const dados = SchemaAbrirRelatorio.parse({ cursoId, periodoLetivoId }); // 2. zod
    const relatorioId = await obterOuCriarRascunho(sessao.usuarioId, dados.cursoId, dados.periodoLetivoId); // 3. serviço
    revalidatePath("/"); // 4. revalidação
    return { ok: true, dados: { relatorioId } };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

const SchemaItem = z.object({
  tipoAtividadeId: z.number().int().positive(),
  horas: z.number().positive(),
  diaSemana: z.enum(DiaSemana),
  horario: z.string().min(1),
  descricao: z.string().min(1),
});

export async function acaoAdicionarItem(relatorioId: number, dados: DadosItem): Promise<Resultado<void>> {
  try {
    await exigirAcessoAoRelatorio(relatorioId, "editar");
    const item = SchemaItem.parse(dados);
    await adicionarItem(relatorioId, item);
    revalidatePath(`/relatorios/${relatorioId}`);
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

const SchemaRemoverItem = z.object({
  relatorioId: z.number().int().positive(),
  itemId: z.number().int().positive(),
});

export async function acaoRemoverItem(relatorioId: number, itemId: number): Promise<Resultado<void>> {
  try {
    await exigirAcessoAoRelatorio(relatorioId, "editar");
    const dados = SchemaRemoverItem.parse({ relatorioId, itemId });
    await removerItem(dados.relatorioId, dados.itemId);
    revalidatePath(`/relatorios/${relatorioId}`);
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}

const SchemaSubmeter = z.object({ relatorioId: z.number().int().positive() });

export async function acaoSubmeter(relatorioId: number): Promise<Resultado<void>> {
  try {
    const sessao = await exigirAcessoAoRelatorio(relatorioId, "editar");
    const dados = SchemaSubmeter.parse({ relatorioId });
    await submeter(dados.relatorioId, sessao.usuarioId);
    revalidatePath("/");
    revalidatePath(`/relatorios/${relatorioId}`);
    return { ok: true, dados: undefined };
  } catch (erro) {
    return paraResultadoErro(erro);
  }
}
