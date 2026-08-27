import type { ReactNode } from "react";

export function TabelaAdmin({ minWidthPx, children }: { minWidthPx: number; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-borda bg-superficie">
      <table className="w-full border-collapse text-left text-[15px]" style={{ minWidth: minWidthPx }}>
        {children}
      </table>
    </div>
  );
}
