import { formatarHoras } from "../lib/formato";

// Horas numa coluna de lista: mono, figuras tabulares e alinhadas à direita,
// para a coluna conferir por casa decimal. Sem valor (rascunho alheio, não
// entregue) vira travessão.
export function Horas({ valor }: { valor: number | null }) {
  return (
    <span className="text-right font-mono text-[15px] font-medium tabular-nums">
      {valor !== null ? formatarHoras(valor) : "—"}
    </span>
  );
}
