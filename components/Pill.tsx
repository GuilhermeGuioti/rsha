// Cor nunca é o único portador de estado: sempre cor + rótulo por extenso +
// marcador de forma (ver CLAUDE.md § Interface).
type Cor = "aprovado" | "neutro" | "interativo";

const estilos: Record<Cor, string> = {
  aprovado: "border-[#a9e6db] bg-[#e7f8f5] text-[#00806b]",
  neutro: "border-borda bg-[#f3f5f8] text-tinta-suave",
  interativo: "border-[#b7dff3] bg-[#e9f6fc] text-azul-interativo",
};

export function Pill({ cor, children }: { cor: Cor; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[13px] font-medium ${estilos[cor]}`}
    >
      <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-current" />
      {children}
    </span>
  );
}
