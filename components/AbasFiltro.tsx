export type OpcaoAba<T extends string> = { valor: T; rotulo: string; contagem: number };

// Fonte única do visual de abas com contagem — usada em toda lista filtrável
// do site (ativos/inativos, situação do período, situação do relatório).
// A aba ativa não depende só da cor: tem fundo cheio, peso maior e
// aria-pressed.
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
      {opcoes.map((opcao) => {
        const ativa = aba === opcao.valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => onMudar(opcao.valor)}
            aria-pressed={ativa}
            className={`flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-[13px] shadow-cartao transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2 ${
              ativa
                ? "border-azul-interativo bg-azul-interativo font-semibold text-white"
                : "border-borda bg-superficie font-medium text-tinta-suave hover:border-azul-borda hover:text-tinta"
            }`}
          >
            {opcao.rotulo}
            <span
              className={`min-w-6 rounded-full px-1.5 py-0.5 text-center font-mono text-[13px] font-medium tabular-nums ${
                ativa ? "bg-white/20" : "bg-papel"
              }`}
            >
              {opcao.contagem}
            </span>
          </button>
        );
      })}
    </div>
  );
}
