import { SituacaoRelatorio } from "../generated/prisma/enums";
import { ROTULO_SITUACAO } from "../lib/formato";
import { Pill } from "./Pill";

type Aparencia = {
  rotulo: string;
  cor: "neutro" | "aguardando" | "devolvido" | "aprovado";
  forma: "circulo" | "circulo-vazado" | "quadrado" | "triangulo";
  barra: string;
};

// Fonte única de como cada situação aparece — a mesma leitura na home, no
// formulário e na fila do coordenador. `barra` é a faixa colorida no topo do
// cartão do relatório.
export const aparenciaSituacao: Record<SituacaoRelatorio, Aparencia> = {
  RASCUNHO: { rotulo: ROTULO_SITUACAO.RASCUNHO, cor: "neutro", forma: "circulo-vazado", barra: "bg-estado-rascunho" },
  AGUARDANDO_AVALIACAO: {
    rotulo: ROTULO_SITUACAO.AGUARDANDO_AVALIACAO,
    cor: "aguardando",
    forma: "quadrado",
    barra: "bg-estado-aguardando",
  },
  DEVOLVIDO_PARA_AJUSTE: {
    rotulo: ROTULO_SITUACAO.DEVOLVIDO_PARA_AJUSTE,
    cor: "devolvido",
    forma: "triangulo",
    barra: "bg-estado-devolvido",
  },
  APROVADO: { rotulo: ROTULO_SITUACAO.APROVADO, cor: "aprovado", forma: "circulo", barra: "bg-estado-aprovado" },
};

export function SituacaoPill({ situacao }: { situacao: SituacaoRelatorio }) {
  const aparencia = aparenciaSituacao[situacao];
  return (
    <Pill cor={aparencia.cor} forma={aparencia.forma}>
      {aparencia.rotulo}
    </Pill>
  );
}
