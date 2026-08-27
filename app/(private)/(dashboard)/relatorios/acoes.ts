"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirSessao, exigirAcessoAoRelatorio } from "../../../../lib/auth/guards";
import { obterOuCriarRascunho, submeter } from "../../../../lib/services/workflow";
import { salvarItens } from "../../../../lib/services/itens";
import { DiaSemana } from "../../../../generated/prisma/client";
import { paraResultadoErro, type Resultado } from "../../../../lib/tipos";

const SchemaAbrirRelatorio = z.object({
  cursoId: z.coerce.number().int().positive(),
  periodoLetivoId: z.coerce.number().int().positive(),
});

// A linha de Relatorio nasce aqui, na primeira vez que o docente abre o curso.
// Redireciona em vez de devolver Resultado: é navegação, não formulário.
export async function acaoAbrirRelatorio(formData: FormData): Promise<void> {
  const sessao = await exigirSessao(); // 1. guard
  const dados = SchemaAbrirRelatorio.parse({
    cursoId: formData.get("cursoId"),
    periodoLetivoId: formData.get("periodoLetivoId"),
  }); // 2. zod
  const relatorioId = await obterOuCriarRascunho(
    sessao.usuarioId,
    dados.cursoId,
    dados.periodoLetivoId,
  ); // 3. serviço
  revalidatePath("/"); // 4. revalidação
  redirect(`/relatorios/${relatorioId}`);
}

const SchemaSalvarItens = z.object({
  relatorioId: z.number().int().positive(),
  itens: z.array(
    z.object({
      tipoAtividadeId: z.number().int().positive(),
      horas: z.number().positive("As horas de cada item precisam ser maiores que zero."),
      diaSemana: z.enum(DiaSemana),
      horario: z.string().trim().min(1, "Informe o horário da atividade."),
      descricao: z.string().trim().min(1, "Descreva a atividade."),
    }),
  ),
});

// Vem do cliente cru — quem estreita `diaSemana` para o enum é o zod abaixo.
export type ItemEnviado = {
  tipoAtividadeId: number;
  horas: number;
  diaSemana: string;
  horario: string;
  descricao: string;
};

export async function acaoSalvarItens(
  relatorioId: number,
  itens: ItemEnviado[],
): Promise<Resultado<void>> {
  try {
    await exigirAcessoAoRelatorio(relatorioId, "editar");
    const dados = SchemaSalvarItens.parse({ relatorioId, itens });
    await salvarItens(dados.relatorioId, dados.itens);
    revalidatePath("/");
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
