"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MensagemErro } from "../../../../../components/MensagemErro";
import { acaoAprovar, acaoDevolver } from "../acoes";

export function PainelDecisao({ relatorioId }: { relatorioId: number }) {
  const router = useRouter();
  const [devolvendo, setDevolvendo] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function aprovar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await acaoAprovar(relatorioId);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      router.refresh();
    });
  }

  function confirmarDevolucao() {
    setErro(null);
    startTransition(async () => {
      const resultado = await acaoDevolver(relatorioId, justificativa);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-md border border-borda bg-superficie p-6">
      <h2 className="font-serif text-lg font-semibold">Sua decisão</h2>

      {erro && (
        <div className="mt-4">
          <MensagemErro>{erro}</MensagemErro>
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={aprovar}
          disabled={pendente || devolvendo}
          className="flex min-h-11 items-center justify-center rounded-md border border-estado-aprovado bg-estado-aprovado px-5 text-[15px] font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendente && !devolvendo ? "Aprovando…" : "Aprovar"}
        </button>
        <button
          type="button"
          onClick={() => setDevolvendo((atual) => !atual)}
          disabled={pendente}
          className="flex min-h-11 items-center justify-center rounded-md border border-estado-devolvido bg-superficie px-5 text-[15px] font-medium text-estado-devolvido hover:bg-[#fdf0ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo disabled:cursor-not-allowed disabled:opacity-60"
        >
          Devolver para ajuste
        </button>
      </div>

      {devolvendo && (
        <div className="mt-5 rounded border border-[#e9c3c0] bg-[#fdf0ef] p-5">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-estado-devolvido">
            <span aria-hidden className="h-2.5 w-3 flex-none bg-estado-devolvido [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
            Devolver para ajuste
          </div>
          <label htmlFor="justificativa-devolucao" className="mt-4 flex flex-col gap-2">
            <span className="text-[13px] font-medium">O que precisa ser ajustado (obrigatório)</span>
            <textarea
              id="justificativa-devolucao"
              value={justificativa}
              onChange={(evento) => setJustificativa(evento.target.value)}
              placeholder="O docente vai ler exatamente este texto. Diga o que falta e onde."
              rows={4}
              className="min-h-[88px] rounded-md border border-borda bg-superficie px-3 py-2.5 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={confirmarDevolucao}
              disabled={pendente || !justificativa.trim()}
              className="flex min-h-11 items-center justify-center rounded-md border border-azul-institucional bg-azul-institucional px-5 text-[15px] font-medium text-white hover:bg-azul-interativo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo disabled:cursor-not-allowed disabled:border-borda disabled:bg-[#edeff3] disabled:text-tinta-suave disabled:opacity-100"
            >
              {pendente && devolvendo ? "Devolvendo…" : "Confirmar devolução"}
            </button>
            {!justificativa.trim() && (
              <span className="text-[13px] leading-snug text-estado-devolvido">
                Escreva a justificativa para liberar a devolução — sem ela o docente não sabe o que corrigir.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
