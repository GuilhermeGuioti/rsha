// Cor nunca é o único portador de estado: sempre cor + rótulo por extenso +
// marcador de forma (ver CLAUDE.md § Interface).
type Cor = "aprovado" | "neutro" | "interativo" | "aguardando" | "devolvido";
export type Forma = "circulo" | "circulo-vazado" | "quadrado" | "triangulo";

const estilos: Record<Cor, string> = {
  aprovado: "border-estado-aprovado-borda bg-estado-aprovado-suave text-estado-aprovado",
  neutro: "border-borda bg-estado-rascunho-suave text-tinta-suave",
  interativo: "border-azul-borda bg-azul-suave text-azul-interativo",
  aguardando: "border-estado-aguardando-borda bg-estado-aguardando-suave text-estado-aguardando",
  devolvido: "border-estado-devolvido-borda bg-estado-devolvido-suave text-estado-devolvido",
};

const formas: Record<Forma, string> = {
  circulo: "h-2.5 w-2.5 rounded-full bg-current",
  "circulo-vazado": "h-2.5 w-2.5 rounded-full border-2 border-current",
  quadrado: "h-2.5 w-2.5 rounded-[2px] bg-current",
  triangulo: "h-2.5 w-3 bg-current [clip-path:polygon(50%_0,100%_100%,0_100%)]",
};

// O marcador sozinho, para quem precisa da forma fora do selo (trilha,
// aviso, mensagem de erro). A cor vem do texto de quem usa (bg-current).
export function Marcador({ forma, className }: { forma: Forma; className?: string }) {
  return <span aria-hidden className={`flex-none ${formas[forma]} ${className ?? ""}`} />;
}

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
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[13px] font-semibold ${estilos[cor]}`}
    >
      <Marcador forma={forma} />
      {children}
    </span>
  );
}
