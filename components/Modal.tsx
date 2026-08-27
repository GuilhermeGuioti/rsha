"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  aberto: boolean;
  eyebrow: string;
  titulo: string;
  descricao?: string;
  onFechar: () => void;
  children: ReactNode;
  rodape: ReactNode;
};

// <dialog> nativo dá foco preso, fechamento por Esc e ::backdrop de graça —
// evita reimplementar isso à mão.
export function Modal({ aberto, eyebrow, titulo, descricao, onFechar, children, rodape }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      onClick={(evento) => {
        if (evento.target === ref.current) onFechar();
      }}
      className="m-auto w-full max-w-lg overflow-hidden rounded-lg border-0 border-t-[3px] border-azul-institucional bg-superficie p-0 shadow-2xl backdrop:bg-[#2a3441]/70"
    >
      <div className="flex items-start justify-between gap-5 border-b border-borda px-6 py-5">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.12em] text-acento">{eyebrow}</p>
          <h2 className="mt-2 font-serif text-[22px] font-semibold text-azul-interativo">{titulo}</h2>
          {descricao && (
            <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-tinta-suave">{descricao}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-md border border-borda text-tinta-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
        >
          ✕
        </button>
      </div>
      <div className="px-6 py-6">{children}</div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-borda bg-papel px-6 py-4">
        {rodape}
      </div>
    </dialog>
  );
}
