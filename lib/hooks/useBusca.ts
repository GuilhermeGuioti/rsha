"use client";

import { useState } from "react";

// Estado de busca por texto livre — repetia em toda lista filtrável
// (trim + lowercase antes de comparar). O componente só usa `normalizado`
// pra filtrar e `valor`/`definir` pra ligar no CampoBusca.
export function useBusca() {
  const [valor, definir] = useState("");
  return { valor, definir, normalizado: valor.trim().toLowerCase() };
}
