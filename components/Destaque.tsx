import type { ReactNode } from "react";
import { Marcador, type Forma } from "./Pill";

type Tom = "devolvido" | "aguardando" | "neutro";

const tons: Record<Tom, { caixa: string; titulo: string; forma: Forma }> = {
  devolvido: {
    caixa: "border-estado-devolvido-borda bg-estado-devolvido-suave",
    titulo: "text-estado-devolvido",
    forma: "triangulo",
  },
  aguardando: {
    caixa: "border-estado-aguardando-borda bg-estado-aguardando-suave",
    titulo: "text-estado-aguardando",
    forma: "quadrado",
  },
  neutro: { caixa: "border-borda bg-superficie-sutil", titulo: "text-tinta", forma: "circulo-vazado" },
};

// Caixa de aviso no tom de uma situação: justificativa de devolução, prazo,
// erro, período encerrado. O título, quando há, leva o mesmo marcador de forma
// do selo da situação — a cor nunca vai sozinha. Tamanho e cor do texto ficam
// com quem usa.
export function Destaque({
  tom,
  titulo,
  nivelTitulo = 2,
  compacto,
  como: Elemento = "div",
  role,
  className,
  children,
}: {
  tom: Tom;
  titulo?: string;
  nivelTitulo?: 2 | 3;
  compacto?: boolean;
  como?: "div" | "p";
  role?: "alert";
  className?: string;
  children: ReactNode;
}) {
  const aparencia = tons[tom];
  const Titulo = nivelTitulo === 2 ? "h2" : "h3";

  return (
    <Elemento
      role={role}
      className={`border ${compacto ? "rounded-xl px-4 py-3" : "rounded-2xl px-5 py-4"} ${aparencia.caixa} ${className ?? ""}`}
    >
      {titulo && (
        <Titulo className={`flex items-center gap-2 text-[15px] font-bold ${aparencia.titulo}`}>
          <Marcador forma={aparencia.forma} />
          {titulo}
        </Titulo>
      )}
      {children}
    </Elemento>
  );
}
