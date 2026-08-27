// Cor nunca é o único portador de estado: sempre cor + rótulo por extenso +
// marcador de forma (ver CLAUDE.md § Interface).
type Cor = "aprovado" | "neutro" | "interativo" | "aguardando" | "devolvido";
type Forma = "circulo" | "circulo-vazado" | "quadrado" | "triangulo";

const estilos: Record<Cor, string> = {
  aprovado: "border-[#a9e6db] bg-[#e7f8f5] text-[#00806b]",
  neutro: "border-borda bg-[#f3f5f8] text-tinta-suave",
  interativo: "border-[#b7dff3] bg-[#e9f6fc] text-azul-interativo",
  aguardando: "border-[#e9cfa0] bg-[#fff6e8] text-estado-aguardando",
  devolvido: "border-[#e9c3c0] bg-[#fdf0ef] text-estado-devolvido",
};

const formas: Record<Forma, string> = {
  circulo: "h-2.5 w-2.5 rounded-full bg-current",
  "circulo-vazado": "h-2.5 w-2.5 rounded-full border-2 border-current",
  quadrado: "h-2.5 w-2.5 bg-current",
  triangulo: "h-2.5 w-3 bg-current [clip-path:polygon(50%_0,100%_100%,0_100%)]",
};

export function Pill({
  cor,
  forma = "circulo",
  children,
}: {
  cor: Cor;
  forma?: Forma;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[13px] font-medium ${estilos[cor]}`}
    >
      <span aria-hidden className={`flex-none ${formas[forma]}`} />
      {children}
    </span>
  );
}
