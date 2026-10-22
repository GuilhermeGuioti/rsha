import { SituacaoRelatorio } from "../generated/prisma/enums";
import { ROTULO_SITUACAO } from "../lib/formato";
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
  RASCUNHO: { rotulo: ROTULO_SITUACAO.RASCUNHO, cor: "neutro", forma: "circulo-vazado", borda: "border-t-estado-rascunho" },
  AGUARDANDO_AVALIACAO: {
    rotulo: ROTULO_SITUACAO.AGUARDANDO_AVALIACAO,
    cor: "aguardando",
    forma: "quadrado",
    borda: "border-t-estado-aguardando",
  },
  DEVOLVIDO_PARA_AJUSTE: {
    rotulo: ROTULO_SITUACAO.DEVOLVIDO_PARA_AJUSTE,
    cor: "devolvido",
    forma: "triangulo",
    borda: "border-t-estado-devolvido",
  },
  APROVADO: { rotulo: ROTULO_SITUACAO.APROVADO, cor: "aprovado", forma: "circulo", borda: "border-t-estado-aprovado" },
};

export function SituacaoPill({ situacao }: { situacao: SituacaoRelatorio }) {
  const aparencia = aparenciaSituacao[situacao];
  return (
    <Pill cor={aparencia.cor} forma={aparencia.forma}>
      {aparencia.rotulo}
    </Pill>
  );
}
