import { SituacaoRelatorio } from "../generated/prisma/enums";
import { Pill } from "./Pill";

type Aparencia = {
  rotulo: string;
  cor: "neutro" | "aguardando" | "devolvido" | "aprovado";
  forma: "circulo" | "circulo-vazado" | "quadrado" | "triangulo";
  borda: string;
};

// Fonte única de como cada situação aparece — a mesma leitura na home, no
// formulário e na fila do coordenador.
export const aparenciaSituacao: Record<SituacaoRelatorio, Aparencia> = {
  RASCUNHO: { rotulo: "Rascunho", cor: "neutro", forma: "circulo-vazado", borda: "border-t-estado-rascunho" },
  AGUARDANDO_AVALIACAO: {
    rotulo: "Aguardando avaliação",
    cor: "aguardando",
    forma: "quadrado",
    borda: "border-t-estado-aguardando",
  },
  DEVOLVIDO_PARA_AJUSTE: {
    rotulo: "Devolvido para ajuste",
    cor: "devolvido",
    forma: "triangulo",
    borda: "border-t-estado-devolvido",
  },
  APROVADO: { rotulo: "Aprovado", cor: "aprovado", forma: "circulo", borda: "border-t-estado-aprovado" },
};

export function SituacaoPill({ situacao }: { situacao: SituacaoRelatorio }) {
  const aparencia = aparenciaSituacao[situacao];
  return (
    <Pill cor={aparencia.cor} forma={aparencia.forma}>
      {aparencia.rotulo}
    </Pill>
  );
}
