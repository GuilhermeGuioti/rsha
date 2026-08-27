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
