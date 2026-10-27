"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MensagemErro } from "../../../../../components/MensagemErro";
import { classeCampo } from "../../../../../components/Campo";
import { classeCartao } from "../../../../../components/Cartao";
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
    <div className={`p-5 sm:p-7 ${classeCartao}`}>
      <h2 className="text-lg font-bold tracking-tight">Sua decisão</h2>
      <p className="mt-1 text-[13px] text-tinta-suave">Aprovar encerra o relatório. Devolver manda de volta ao docente.</p>

      {erro && (
        <div className="mt-4">
          <MensagemErro>{erro}</MensagemErro>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={aprovar}
          disabled={pendente || devolvendo}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-estado-aprovado px-5 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgb(30_122_70/0.25)] transition-[background-color,translate] hover:bg-[#166238] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          {pendente && !devolvendo ? "Aprovando…" : "Aprovar"}
        </button>
        <button
          type="button"
          onClick={() => setDevolvendo((atual) => !atual)}
          disabled={pendente}
          aria-expanded={devolvendo}
          className="flex min-h-11 items-center justify-center rounded-lg border border-estado-devolvido-borda bg-superficie px-5 text-[15px] font-semibold text-estado-devolvido transition-colors hover:border-estado-devolvido hover:bg-estado-devolvido-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Devolver para ajuste
        </button>
      </div>

      {devolvendo && (
        <div className="mt-5 rounded-2xl border border-estado-devolvido-borda bg-estado-devolvido-suave p-5">
          <div className="flex items-center gap-2 text-[15px] font-bold text-estado-devolvido">
            <span aria-hidden className="h-2.5 w-3 flex-none bg-estado-devolvido [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
            Devolver para ajuste
          </div>
          <label htmlFor="justificativa-devolucao" className="mt-4 flex flex-col gap-2">
            <span className="text-[13px] font-semibold">O que precisa ser ajustado (obrigatório)</span>
            <textarea
              id="justificativa-devolucao"
              value={justificativa}
              onChange={(evento) => setJustificativa(evento.target.value)}
              placeholder="O docente vai ler exatamente este texto. Diga o que falta e onde."
              rows={4}
              className={`${classeCampo} min-h-[88px] py-2.5`}
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3.5">
            {/* Desabilitado fica cinza mas legível: a frase ao lado explica o porquê. */}
            <button
              type="button"
              onClick={confirmarDevolucao}
              disabled={pendente || !justificativa.trim()}
              className="flex min-h-11 items-center justify-center rounded-lg bg-azul-interativo px-5 text-[15px] font-semibold text-white shadow-botao transition-colors hover:bg-azul-escuro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border disabled:border-borda disabled:bg-estado-rascunho-suave disabled:text-tinta-suave disabled:shadow-none"
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
