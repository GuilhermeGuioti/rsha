import type { ReactNode } from "react";

export function LinhaVazia({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-tinta-suave">
        {children}
      </td>
    </tr>
  );
}
