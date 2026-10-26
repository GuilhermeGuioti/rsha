import { prisma } from "../db";
import { DiaSemana, SituacaoRelatorio, TipoEvento } from "../../generated/prisma/client";

export type ItemExportado = {
  tipoAtividade: string;
  diaSemana: DiaSemana;
  horario: string;
  descricao: string;
  horas: number;
};

export type EventoExportado = {
  tipo: TipoEvento;
  autor: string;
  ocorridoEm: Date;
  justificativa: string | null;
};

export type RelatorioExportado = {
  id: number;
  ano: number;
  semestre: number;
  curso: string;
  docente: string;
  emailDocente: string;
  cargaHorariaTotal: number;
  itens: ItemExportado[];
  eventos: EventoExportado[];
  enviadoEm: Date;
  aprovadoPor: string;
  aprovadoEm: Date;
};

/**
 * Dados do relatório para exportação em PDF (RF15).
 *
 * Só relatório APROVADO é exportável — o critério de aceite do RF15 fala do
 * arquivo do relatório aprovado, e é a única situação em que a autoria e a
 * aprovação da trilha estão completas. Rascunho e relatório em avaliação se
 * leem na tela.
 *
 * Devolve `number`, nunca o Decimal do Prisma: o retorno atravessa a
 * fronteira servidor → cliente na rota de download (ver CLAUDE.md § modelo
 * de dados).
 */
export async function obterRelatorioAprovadoParaPdf(relatorioId: number): Promise<RelatorioExportado> {
  const relatorio = await prisma.relatorio.findUnique({
    where: { id: relatorioId },
    include: {
      docente: true,
      curso: true,
      periodo: true,
      itens: { include: { tipoAtividade: true }, orderBy: { id: "asc" } },
      // Ordem cronológica: o documento impresso se lê de cima para baixo, do
      // primeiro evento ao último (a coluna da tela mostra o mais recente
      // primeiro, que é o oposto do que se espera numa via impressa).
      eventos: { include: { usuario: true }, orderBy: { ocorridoEm: "asc" } },
    },
  });

  if (!relatorio) {
    throw new Error("Relatório não encontrado.");
  }
  if (relatorio.situacao !== SituacaoRelatorio.APROVADO) {
    throw new Error("Só relatório aprovado pode ser exportado em PDF.");
  }

  const aprovacao = relatorio.eventos.find((evento) => evento.tipo === TipoEvento.APROVACAO);
  if (!aprovacao) {
    throw new Error("Relatório aprovado sem evento de aprovação na trilha de auditoria.");
  }
  // A versão aprovada é a do último envio — os anteriores foram devolvidos.
  const envio = [...relatorio.eventos].reverse().find((evento) => evento.tipo === TipoEvento.SUBMISSAO);
  if (!envio) {
    throw new Error("Relatório aprovado sem evento de envio na trilha de auditoria.");
  }

  return {
    id: relatorio.id,
    ano: relatorio.periodo.ano,
    semestre: relatorio.periodo.semestre,
    curso: relatorio.curso.nome,
    docente: relatorio.docente.nome,
    emailDocente: relatorio.docente.email,
    cargaHorariaTotal: relatorio.cargaHorariaTotal.toNumber(),
    itens: relatorio.itens.map((item) => ({
      tipoAtividade: item.tipoAtividade.descricao,
      diaSemana: item.diaSemana,
      horario: item.horario,
      descricao: item.descricao,
      horas: item.horas.toNumber(),
    })),
    eventos: relatorio.eventos.map((evento) => ({
      tipo: evento.tipo,
      autor: evento.usuario.nome,
      ocorridoEm: evento.ocorridoEm,
      justificativa: evento.justificativa,
    })),
    enviadoEm: envio.ocorridoEm,
    aprovadoPor: aprovacao.usuario.nome,
    aprovadoEm: aprovacao.ocorridoEm,
  };
}
