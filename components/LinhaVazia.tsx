import type { ReactNode } from "react";

export function LinhaVazia({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-[15px] text-tinta-suave">
        {children}
      </td>
    </tr>
  );
}
