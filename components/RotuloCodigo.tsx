import type { ReactNode } from "react";

// O identificador REL-ano-semestre-id acima do nome do relatório — o que o
// docente lê na tela e cita no telefone com a coordenação.
export function RotuloCodigo({ children }: { children: ReactNode }) {
  return <div className="font-mono text-xs font-medium tracking-[.1em] text-tinta-suave">{children}</div>;
}
