import { prisma } from "../db";
import { Prisma, SituacaoRelatorio, TipoEvento } from "../../generated/prisma/client";
import { formatarDataHora } from "../formato";

/**
 * Roteamento automático: o avaliador é o primeiro coordenador ativo vinculado
 * ao curso — mesmo quando o autor do relatório é esse coordenador.
 * Autoaprovação é permitida de propósito. Coordenador inativado não entra
 * mais no sistema, então o próximo ativo assume a fila do curso. Sem nenhum
 * coordenador ativo, não há avaliador.
 */
export async function resolverAvaliadorId(
  cliente: Prisma.TransactionClient,
  cursoId: number,
): Promise<number | null> {
  const vinculo = await cliente.vinculoCoordenadorCurso.findFirst({
    where: { cursoId, coordenador: { ativo: true } },
    orderBy: { id: "asc" },
  });
  return vinculo?.coordenadorId ?? null;
}

/**
 * Trava a linha do relatório até o fim da transação. No READ COMMITTED do
 * Postgres, duas transações simultâneas (duas abas, clique duplo) liam a mesma
 * situação e as duas gravavam a transição — o mesmo relatório chegava a ser
 * devolvido e aprovado. Com a trava, a segunda espera a primeira terminar e
 * já lê a situação nova. Vem antes de qualquer leitura do relatório.
 */
export async function travarRelatorio(cliente: Prisma.TransactionClient, relatorioId: number): Promise<void> {
  await cliente.$queryRaw`SELECT 1 FROM "Relatorio" WHERE "id" = ${relatorioId} FOR UPDATE`;
}

// Devolvido ganha este prazo, contado da devolução, para corrigir e reenviar.
export const DIAS_PRAZO_APOS_DEVOLUCAO = 7;

/**
 * Até quando o docente pode mexer no relatório e enviá-lo (RF19). Rascunho
 * segue o encerramento do período. Devolvido vai até o maior entre o
 * encerramento e a última devolução + DIAS_PRAZO_APOS_DEVOLUCAO: a avaliação
 * continua depois que a submissão fecha, e uma devolução no último dia (ou
 * depois dele) não pode deixar o docente sem tempo de corrigir.
 */
export function prazoDeEntrega(
  situacao: SituacaoRelatorio,
  encerramentoSubmissao: Date,
  ultimaDevolucao: Date | null,
): Date {
  if (situacao !== SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE || !ultimaDevolucao) {
    return encerramentoSubmissao;
  }
  const prazoDevolucao = new Date(ultimaDevolucao.getTime() + DIAS_PRAZO_APOS_DEVOLUCAO * 86_400_000);
  return prazoDevolucao > encerramentoSubmissao ? prazoDevolucao : encerramentoSubmissao;
}

/**
 * Barra escrita do docente fora da janela de entrega: criar, editar e enviar
 * só valem entre a abertura do período e o prazo de entrega. Consulta
 * continua livre. O RF19 pede a indicação da data limite junto do bloqueio.
 */
export async function exigirDentroDoPrazo(
  cliente: Prisma.TransactionClient,
  relatorio: {
    id: number;
    situacao: SituacaoRelatorio;
    periodo: { aberturaSubmissao: Date; encerramentoSubmissao: Date };
  },
): Promise<void> {
  const devolucao =
    relatorio.situacao === SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE
      ? await cliente.eventoAuditoria.findFirst({
          where: { relatorioId: relatorio.id, tipo: TipoEvento.DEVOLUCAO },
          orderBy: { ocorridoEm: "desc" },
        })
      : null;
  const prazo = prazoDeEntrega(
    relatorio.situacao,
    relatorio.periodo.encerramentoSubmissao,
    devolucao?.ocorridoEm ?? null,
  );
  exigirJanelaAberta(relatorio.periodo.aberturaSubmissao, prazo);
}

function exigirJanelaAberta(abertura: Date, prazo: Date): void {
  const agora = new Date();
  if (agora < abertura) {
    throw new Error(`A entrega deste relatório abre em ${formatarDataHora(abertura)}.`);
  }
  if (agora > prazo) {
    throw new Error(`O prazo de entrega deste relatório encerrou em ${formatarDataHora(prazo)}.`);
  }
}

/**
 * A linha de Relatorio nasce sob demanda: só existe a partir da primeira
 * escrita do próprio docente (abrir o curso e salvar rascunho, ou adicionar
 * o primeiro item). Nunca é criada em lote no cadastro do período.
 */
export async function obterOuCriarRascunho(
  docenteId: number,
  cursoId: number,
  periodoLetivoId: number,
): Promise<number> {
  const vinculo = await prisma.vinculoDocenteCurso.findUnique({
    where: { docenteId_cursoId_periodoLetivoId: { docenteId, cursoId, periodoLetivoId } },
    include: { periodo: true },
  });
  if (!vinculo) {
    throw new Error("Docente não está vinculado a este curso neste período.");
  }

  // ponytail: sem retry — dois cliques simultâneos do mesmo docente fazem o
  // segundo esbarrar no @@unique. Se virar reclamação, tratar P2002 e reler.
  return prisma.$transaction(async (tx) => {
    const existente = await tx.relatorio.findUnique({
      where: { docenteId_cursoId_periodoLetivoId: { docenteId, cursoId, periodoLetivoId } },
    });
    if (existente) {
      return existente.id;
    }
    // Abrir relatório já existente é consulta e vale sempre; criar é escrita
    // e só vale dentro da janela do período.
    exigirJanelaAberta(vinculo.periodo.aberturaSubmissao, vinculo.periodo.encerramentoSubmissao);
    const criado = await tx.relatorio.create({ data: { docenteId, cursoId, periodoLetivoId } });
    await tx.eventoAuditoria.create({
      data: { relatorioId: criado.id, tipo: TipoEvento.CRIACAO, usuarioId: docenteId },
    });
    return criado.id;
  });
}

export async function submeter(relatorioId: number, usuarioId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await travarRelatorio(tx, relatorioId);
    const relatorio = await tx.relatorio.findUnique({
      where: { id: relatorioId },
      include: { periodo: true },
    });
    if (!relatorio) {
      throw new Error("Relatório não encontrado.");
    }
    if (relatorio.docenteId !== usuarioId) {
      throw new Error("Apenas o autor do relatório pode submetê-lo.");
    }
    if (
      relatorio.situacao !== SituacaoRelatorio.RASCUNHO &&
      relatorio.situacao !== SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE
    ) {
      throw new Error(`Não é possível submeter um relatório em situação ${relatorio.situacao}.`);
    }
    await exigirDentroDoPrazo(tx, relatorio);

    // RF05: relatório sem item não é submetido — a tela já desabilita o
    // botão, mas a action é chamável direto.
    const totalItens = await tx.itemAtividade.count({ where: { relatorioId } });
    if (totalItens === 0) {
      throw new Error("Adicione ao menos um item de atividade antes de enviar o relatório.");
    }

    const avaliadorId = await resolverAvaliadorId(tx, relatorio.cursoId);
    if (avaliadorId === null) {
      throw new Error(
        "Nenhum coordenador ativo vinculado a este curso — a secretaria precisa cadastrar um antes da submissão.",
      );
    }

    await tx.relatorio.update({
      where: { id: relatorioId },
      data: { situacao: SituacaoRelatorio.AGUARDANDO_AVALIACAO },
    });
    await tx.eventoAuditoria.create({
      data: { relatorioId, tipo: TipoEvento.SUBMISSAO, usuarioId },
    });
  });
}

export async function aprovar(relatorioId: number, usuarioId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await travarRelatorio(tx, relatorioId);
    const relatorio = await tx.relatorio.findUnique({ where: { id: relatorioId } });
    if (!relatorio) {
      throw new Error("Relatório não encontrado.");
    }
    if (relatorio.situacao !== SituacaoRelatorio.AGUARDANDO_AVALIACAO) {
      throw new Error(`Não é possível aprovar um relatório em situação ${relatorio.situacao}.`);
    }

    const avaliadorId = await resolverAvaliadorId(tx, relatorio.cursoId);
    if (avaliadorId !== usuarioId) {
      throw new Error("Usuário não é o avaliador responsável por este relatório.");
    }

    await tx.relatorio.update({
      where: { id: relatorioId },
      data: { situacao: SituacaoRelatorio.APROVADO },
    });
    await tx.eventoAuditoria.create({
      data: { relatorioId, tipo: TipoEvento.APROVACAO, usuarioId },
    });
  });
}

export async function devolver(
  relatorioId: number,
  usuarioId: number,
  justificativa: string,
): Promise<void> {
  if (!justificativa.trim()) {
    throw new Error("Justificativa é obrigatória para devolver o relatório.");
  }

  await prisma.$transaction(async (tx) => {
    await travarRelatorio(tx, relatorioId);
    const relatorio = await tx.relatorio.findUnique({ where: { id: relatorioId } });
    if (!relatorio) {
      throw new Error("Relatório não encontrado.");
    }
    if (relatorio.situacao !== SituacaoRelatorio.AGUARDANDO_AVALIACAO) {
      throw new Error(`Não é possível devolver um relatório em situação ${relatorio.situacao}.`);
    }

    const avaliadorId = await resolverAvaliadorId(tx, relatorio.cursoId);
    if (avaliadorId !== usuarioId) {
      throw new Error("Usuário não é o avaliador responsável por este relatório.");
    }

    await tx.relatorio.update({
      where: { id: relatorioId },
      data: { situacao: SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE },
    });
    await tx.eventoAuditoria.create({
      data: { relatorioId, tipo: TipoEvento.DEVOLUCAO, usuarioId, justificativa },
    });
  });
}
