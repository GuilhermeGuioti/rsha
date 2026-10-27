import type { ReactNode } from "react";
import { classeCartao } from "./Cartao";

export function TabelaAdmin({
  minWidthPx,
  layoutFixo,
  children,
}: {
  minWidthPx: number;
  layoutFixo?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`overflow-x-auto ${classeCartao}`}>
      <table
        className="w-full border-collapse text-left text-[15px]"
        style={{ minWidth: minWidthPx, tableLayout: layoutFixo ? "fixed" : undefined }}
      >
        {children}
      </table>
    </div>
  );
}
