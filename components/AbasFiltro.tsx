export type OpcaoAba<T extends string> = { valor: T; rotulo: string; contagem: number };

// Fonte única do visual de abas com contagem — usada em toda lista filtrável
// do site (ativos/inativos, situação do período, situação do relatório).
export function AbasFiltro<T extends string>({
  aba,
  onMudar,
  opcoes,
}: {
  aba: T;
  onMudar: (aba: T) => void;
  opcoes: OpcaoAba<T>[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onMudar(opcao.valor)}
          aria-pressed={aba === opcao.valor}
          className={`flex min-h-10 items-center rounded-md px-3.5 text-[13px] ${
            aba === opcao.valor
              ? "bg-azul-institucional font-medium text-white"
              : "border border-borda bg-superficie text-tinta-suave"
          }`}
        >
          {opcao.rotulo} ({opcao.contagem})
        </button>
      ))}
    </div>
  );
}
