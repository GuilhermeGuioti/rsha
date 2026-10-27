import { formatarDataHora } from "../lib/formato";
import { Marcador } from "./Pill";

// O selo do relatório aprovado, que é terminal: em vez do selo de situação,
// um carimbo com quem aprovou e quando — o mesmo que a trilha registra. Leva
// a forma e o rótulo por extenso, como todo indicador de estado. Não é o
// carimbo de autenticidade do PDF: o código fica só no papel.
export function Carimbo({ aprovadoEm, avaliador }: { aprovadoEm: Date; avaliador: string }) {
  return (
    <div className="w-fit -rotate-2 rounded-md border-[3px] border-double border-estado-aprovado bg-superficie px-3.5 py-2 text-estado-aprovado">
      <p className="flex items-center gap-2 font-mono text-[13px] font-semibold tracking-[0.16em] uppercase">
        <Marcador forma="circulo" />
        Aprovado
      </p>
      <p className="mt-1 font-mono text-[13px] font-medium">{formatarDataHora(aprovadoEm)}</p>
      <p className="text-[13px]">{avaliador}</p>
    </div>
  );
}
