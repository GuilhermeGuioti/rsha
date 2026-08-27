type Aba = "ativos" | "inativos";

export function AbasAtivoInativo({
  aba,
  onMudar,
  contagemAtivos,
  contagemInativos,
}: {
  aba: Aba;
  onMudar: (aba: Aba) => void;
  contagemAtivos: number;
  contagemInativos: number;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onMudar("ativos")}
        className={`flex min-h-10 items-center rounded-md px-3.5 text-[13px] ${aba === "ativos" ? "bg-azul-institucional font-medium text-white" : "border border-borda bg-superficie text-tinta-suave"}`}
      >
        Ativos ({contagemAtivos})
      </button>
      <button
        type="button"
        onClick={() => onMudar("inativos")}
        className={`flex min-h-10 items-center rounded-md px-3.5 text-[13px] ${aba === "inativos" ? "bg-azul-institucional font-medium text-white" : "border border-borda bg-superficie text-tinta-suave"}`}
      >
        Inativos ({contagemInativos})
      </button>
    </>
  );
}
