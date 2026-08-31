import { exigirSessaoPagina } from "../../../../lib/auth/guards";
import { prisma } from "../../../../lib/db";
import { SituacaoRelatorio } from "../../../../generated/prisma/enums";
import { resolverAvaliadorId } from "../../../../lib/services/workflow";
import { ListaAvaliacao, type ItemFila } from "./lista-avaliacao";

export default async function AvaliacaoPage() {
  const sessao = await exigirSessaoPagina();

  // Não filtra por período aberto: a avaliação continua depois que a
  // submissão fecha — é justamente o período de pico que o RNF01 antecipa.
  const periodo = await prisma.periodoLetivo.findFirst({
    orderBy: [{ ano: "desc" }, { semestre: "desc" }],
  });

  if (!periodo) {
    return (
      <p className="text-[15px] text-tinta-suave">Nenhum período letivo cadastrado ainda.</p>
    );
  }

  const relatorios = await prisma.relatorio.findMany({
    where: {
      periodoLetivoId: periodo.id,
      situacao: {
        in: [
          SituacaoRelatorio.AGUARDANDO_AVALIACAO,
          SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE,
          SituacaoRelatorio.APROVADO,
        ],
      },
    },
    include: { docente: true, curso: true, eventos: { orderBy: { ocorridoEm: "desc" }, take: 1 } },
    orderBy: { curso: { nome: "asc" } },
  });

  // O avaliador é resolvido por relatório (não por curso): o RF22 desvia o
  // relatório do próprio coordenador para o avaliador alternativo.
  const daFila = (
    await Promise.all(
      relatorios.map(async (relatorio) => {
        const avaliadorId = await resolverAvaliadorId(prisma, relatorio.cursoId, relatorio.docenteId);
        return avaliadorId === sessao.usuarioId ? relatorio : null;
      }),
    )
  ).filter((relatorio) => relatorio !== null);

  const cursoIds = [...new Set(daFila.map((relatorio) => relatorio.cursoId))];
  const totaisPorCurso = new Map(
    await Promise.all(
      cursoIds.map(
        async (cursoId) =>
          [
            cursoId,
            await prisma.vinculoDocenteCurso.count({ where: { cursoId, periodoLetivoId: periodo.id } }),
          ] as const,
      ),
    ),
  );

  const itens: ItemFila[] = daFila.map((relatorio) => ({
    id: relatorio.id,
    docenteNome: relatorio.docente.nome,
    cursoId: relatorio.cursoId,
    cursoNome: relatorio.curso.nome,
    situacao: relatorio.situacao,
    horas: relatorio.cargaHorariaTotal.toNumber(),
    // O evento mais recente sempre corresponde à situação atual — cada
    // transição do workflow grava exatamente um evento (ver workflow.ts).
    desde: relatorio.eventos[0].ocorridoEm,
    totalDocentesNoCurso: totaisPorCurso.get(relatorio.cursoId) ?? 0,
  }));

  return (
    <ListaAvaliacao
      itens={itens}
      periodoRotulo={`${periodo.semestre}º semestre de ${periodo.ano}`}
    />
  );
}
