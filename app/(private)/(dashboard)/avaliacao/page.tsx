import { exigirSessaoPagina } from "../../../../lib/auth/guards";
import { prisma } from "../../../../lib/db";
import { SituacaoRelatorio } from "../../../../generated/prisma/enums";
import { resolverAvaliadorId } from "../../../../lib/services/workflow";
import { ListaAvaliacao, type ItemFila } from "./lista-avaliacao";

export default async function AvaliacaoPage() {
  const sessao = await exigirSessaoPagina();

  const periodos = await prisma.periodoLetivo.findMany({
    orderBy: [{ ano: "desc" }, { semestre: "desc" }],
  });

  if (periodos.length === 0) {
    return <p className="text-[15px] text-tinta-suave">Nenhum período letivo cadastrado ainda.</p>;
  }

  // Traz todos os períodos, não só o mais recente: a avaliação continua
  // depois que a submissão fecha (é o pico que o RNF01 antecipa), e uma
  // pendência de um período anterior não pode sumir da fila só porque um
  // novo período começou. O filtro por período fica por conta do cliente.
  const relatorios = await prisma.relatorio.findMany({
    where: {
      situacao: {
        in: [
          SituacaoRelatorio.AGUARDANDO_AVALIACAO,
          SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE,
          SituacaoRelatorio.APROVADO,
        ],
      },
    },
    include: {
      docente: true,
      curso: true,
      periodo: true,
      eventos: { orderBy: { ocorridoEm: "desc" }, take: 1 },
    },
    orderBy: { curso: { nome: "asc" } },
  });

  // O avaliador é o coordenador do curso, independente de quem é o autor
  // (autoaprovação permitida) — então resolve uma vez por curso, não por
  // relatório.
  const todosCursoIds = [...new Set(relatorios.map((relatorio) => relatorio.cursoId))];
  const avaliadorPorCurso = new Map(
    await Promise.all(
      todosCursoIds.map(async (cursoId) => [cursoId, await resolverAvaliadorId(prisma, cursoId)] as const),
    ),
  );
  const daFila = relatorios.filter(
    (relatorio) => avaliadorPorCurso.get(relatorio.cursoId) === sessao.usuarioId,
  );

  // Total de docentes no curso é por período (a turma muda de semestre a
  // semestre), não um número único por curso.
  const paresCursoPeriodo = [...new Set(daFila.map((r) => `${r.cursoId}:${r.periodoLetivoId}`))];
  const totaisPorPar = new Map(
    await Promise.all(
      paresCursoPeriodo.map(async (chave) => {
        const [cursoId, periodoLetivoId] = chave.split(":").map(Number);
        const total = await prisma.vinculoDocenteCurso.count({ where: { cursoId, periodoLetivoId } });
        return [chave, total] as const;
      }),
    ),
  );

  const itens: ItemFila[] = daFila.map((relatorio) => ({
    id: relatorio.id,
    docenteNome: relatorio.docente.nome,
    cursoId: relatorio.cursoId,
    cursoNome: relatorio.curso.nome,
    periodoLetivoId: relatorio.periodoLetivoId,
    periodoRotulo: `${relatorio.periodo.semestre}º semestre de ${relatorio.periodo.ano}`,
    situacao: relatorio.situacao,
    horas: relatorio.cargaHorariaTotal.toNumber(),
    // O evento mais recente sempre corresponde à situação atual — cada
    // transição do workflow grava exatamente um evento (ver workflow.ts).
    desde: relatorio.eventos[0].ocorridoEm,
    totalDocentesNoCurso: totaisPorPar.get(`${relatorio.cursoId}:${relatorio.periodoLetivoId}`) ?? 0,
  }));

  return (
    <ListaAvaliacao
      itens={itens}
      periodos={periodos.map((periodo) => ({
        id: periodo.id,
        rotulo: `${periodo.semestre}º semestre de ${periodo.ano}`,
      }))}
    />
  );
}
