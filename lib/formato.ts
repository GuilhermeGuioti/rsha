import type { DiaSemana, TipoEvento } from "../generated/prisma/enums";

// Números sempre com vírgula e uma casa — as colunas de horas alinham por
// casa decimal (ver CLAUDE.md § Interface).
export function formatarHoras(horas: number): string {
  return horas.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Identificador que o docente lê na tela e cita no telefone com a coordenação.
export function codigoRelatorio(ano: number, semestre: number, id: number): string {
  return `REL-${ano}-${semestre}-${String(id).padStart(3, "0")}`;
}

export function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Rótulo de cada dia da semana. Fonte única — a mesma leitura no formulário
// da tela e no PDF exportado.
export const ROTULO_DIA_SEMANA: Record<DiaSemana, string> = {
  SEGUNDA: "Segunda",
  TERCA: "Terça",
  QUARTA: "Quarta",
  QUINTA: "Quinta",
  SEXTA: "Sexta",
  SABADO: "Sábado",
};

// Como cada evento da auditoria se chama para quem lê. Fonte única — a mesma
// palavra na trilha da tela e na trilha impressa no PDF.
export const ROTULO_EVENTO: Record<TipoEvento, string> = {
  CRIACAO: "Relatório criado",
  SUBMISSAO: "Enviado para avaliação",
  DEVOLUCAO: "Devolvido para ajuste",
  APROVACAO: "Aprovado",
};
