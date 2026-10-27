import { Pill } from "./Pill";

export type ChaveSituacaoPeriodo = "AGENDADO" | "ABERTO" | "ENCERRADO";

type Prazos = { aberturaSubmissao: Date | string; encerramentoSubmissao: Date | string };

const APARENCIA: Record<ChaveSituacaoPeriodo, { rotulo: string; cor: "aprovado" | "neutro" | "interativo" }> = {
  AGENDADO: { rotulo: "Agendado", cor: "interativo" },
  ABERTO: { rotulo: "Aberto", cor: "aprovado" },
  ENCERRADO: { rotulo: "Encerrado", cor: "neutro" },
};

// A situação do período pelo prazo de submissão — a mesma leitura na lista de
// períodos e no início da secretaria. Aceita string porque a lista recebe as
// datas já serializadas pela fronteira servidor → cliente.
export function situacaoPeriodo(periodo: Prazos): ChaveSituacaoPeriodo {
  const agora = new Date();
  if (agora < new Date(periodo.aberturaSubmissao)) return "AGENDADO";
  if (agora > new Date(periodo.encerramentoSubmissao)) return "ENCERRADO";
  return "ABERTO";
}

export function SituacaoPeriodoPill({ periodo }: { periodo: Prazos }) {
  const { rotulo, cor } = APARENCIA[situacaoPeriodo(periodo)];
  return <Pill cor={cor}>{rotulo}</Pill>;
}
