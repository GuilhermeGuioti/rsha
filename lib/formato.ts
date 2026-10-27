import type { DiaSemana, SituacaoRelatorio, TipoEvento } from "../generated/prisma/enums";

// Números sempre com vírgula e uma casa — as colunas de horas alinham por
// casa decimal (ver CLAUDE.md § Interface).
export function formatarHoras(horas: number): string {
  return horas.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// "Olá, Helena": só o primeiro nome, como a pessoa é chamada no dia a dia.
export function saudacao(nome: string): string {
  return `Olá, ${nome.trim().split(/\s+/)[0]}`;
}

// Identificador que o docente lê na tela e cita no telefone com a coordenação.
export function codigoRelatorio(ano: number, semestre: number, id: number): string {
  return `REL-${ano}-${semestre}-${String(id).padStart(3, "0")}`;
}

// Datas ficam em UTC no banco e são convertidas na exibição — sempre para o
// fuso da instituição, nunca o do processo: na Vercel o servidor roda em UTC,
// e um prazo às 23:59 de Brasília apareceria como o dia seguinte. Fixar o fuso
// também faz o HTML do servidor e a hidratação no navegador concordarem.
const FUSO = "America/Sao_Paulo";

export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: FUSO });
}

export function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO });
}

// Sem a vírgula entre data e hora: assim o Excel em português reconhece a
// célula como data, em vez de tratá-la como texto.
export function formatarDataHoraPlanilha(data: Date): string {
  return formatarDataHora(data).replace(", ", " ");
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

// Como cada situação se chama por extenso. Fonte única — a mesma palavra no
// selo da tela e na planilha extraída.
export const ROTULO_SITUACAO: Record<SituacaoRelatorio, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_AVALIACAO: "Aguardando avaliação",
  DEVOLVIDO_PARA_AJUSTE: "Devolvido para ajuste",
  APROVADO: "Aprovado",
};

// Como cada evento da auditoria se chama para quem lê. Fonte única — a mesma
// palavra na trilha da tela e na trilha impressa no PDF.
export const ROTULO_EVENTO: Record<TipoEvento, string> = {
  CRIACAO: "Relatório criado",
  SUBMISSAO: "Enviado para avaliação",
  DEVOLUCAO: "Devolvido para ajuste",
  APROVACAO: "Aprovado",
};
