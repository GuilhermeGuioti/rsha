import Papa from "papaparse";
import { prisma } from "../db";
import { TipoEvento } from "../../generated/prisma/client";
import {
  codigoRelatorio,
  formatarDataHoraPlanilha,
  formatarHoras,
  ROTULO_DIA_SEMANA,
  ROTULO_SITUACAO,
} from "../formato";

export const COLUNAS_EXTRACAO = [
  "Ano",
  "Semestre",
  "Relatório",
  "Curso",
  "Docente",
  "E-mail do docente",
  "Situação",
  "Tipo de atividade",
  "Dia da semana",
  "Horário",
  "Horas",
  "Descrição",
  "Carga horária total",
  "Criado em",
  "Último envio em",
  "Última devolução em",
  "Aprovado em",
] as const;

export type ExtracaoPeriodo = { ano: number; semestre: number; csv: string };

/**
 * Planilha consolidada do período (RF21): uma linha por item de atividade,
 * com os dados do relatório repetidos em cada linha para a planilha poder ser
 * filtrada e somada sem juntar abas.
 *
 * Relatório sem item não gera linha — inclusive os "não iniciados", que nem
 * existem na tabela (quem ainda não entregou se vê no painel de acompanhamento).
 *
 * Formato pensado para o Excel em português: separador `;`, BOM UTF-8 para os
 * acentos e horas com vírgula decimal.
 */
export async function extrairPeriodo(periodoLetivoId: number): Promise<ExtracaoPeriodo> {
  const periodo = await prisma.periodoLetivo.findUnique({ where: { id: periodoLetivoId } });
  if (!periodo) {
    throw new Error("Período letivo não encontrado.");
  }

  const relatorios = await prisma.relatorio.findMany({
    where: { periodoLetivoId },
    include: {
      docente: true,
      curso: true,
      itens: { include: { tipoAtividade: true }, orderBy: { id: "asc" } },
      eventos: { orderBy: { ocorridoEm: "asc" } },
    },
  });
  relatorios.sort(
    (a, b) =>
      a.curso.nome.localeCompare(b.curso.nome, "pt-BR") || a.docente.nome.localeCompare(b.docente.nome, "pt-BR"),
  );

  const linhas = relatorios.flatMap((relatorio) => {
    // Sem limite de devoluções: cada ciclo é um evento, e a planilha mostra o último.
    const ultimo = (tipo: TipoEvento) => relatorio.eventos.findLast((evento) => evento.tipo === tipo)?.ocorridoEm;
    const data = (valor: Date | undefined) => (valor ? formatarDataHoraPlanilha(valor) : "");
    // Todas as datas saem da trilha de auditoria, que é o registro da
    // tramitação (RF12); criadoEm da linha só cobre relatório sem o evento.
    const criacao = ultimo(TipoEvento.CRIACAO) ?? relatorio.criadoEm;
    const envio = ultimo(TipoEvento.SUBMISSAO);
    const devolucao = ultimo(TipoEvento.DEVOLUCAO);
    const aprovacao = ultimo(TipoEvento.APROVACAO);

    return relatorio.itens.map((item) => [
      periodo.ano,
      periodo.semestre,
      codigoRelatorio(periodo.ano, periodo.semestre, relatorio.id),
      relatorio.curso.nome,
      relatorio.docente.nome,
      relatorio.docente.email,
      ROTULO_SITUACAO[relatorio.situacao],
      item.tipoAtividade.descricao,
      ROTULO_DIA_SEMANA[item.diaSemana],
      item.horario,
      formatarHoras(item.horas.toNumber()),
      item.descricao,
      formatarHoras(relatorio.cargaHorariaTotal.toNumber()),
      formatarDataHoraPlanilha(criacao),
      data(envio),
      data(devolucao),
      data(aprovacao),
    ]);
  });

  const csv = Papa.unparse(
    { fields: [...COLUNAS_EXTRACAO], data: linhas },
    {
      delimiter: ";",
      newline: "\r\n",
      // Descrição é texto livre do docente: célula começando com "=", "+",
      // "-" ou "@" viraria fórmula ao abrir no Excel.
      escapeFormulae: true,
    },
  );

  return { ano: periodo.ano, semestre: periodo.semestre, csv: `﻿${csv}` };
}
