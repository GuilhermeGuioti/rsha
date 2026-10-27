"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconeFechar } from "./Icones";
import { Sobretitulo } from "./Sobretitulo";

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
      className="m-auto w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-3xl border border-borda bg-superficie p-0 text-tinta shadow-flutuante backdrop:bg-[#0b2235]/55 backdrop:backdrop-blur-[2px] open:animate-surgir"
    >
      <div className="flex items-start justify-between gap-5 px-6 pt-6 pb-5">
        <div className="min-w-0">
          <Sobretitulo>{eyebrow}</Sobretitulo>
          <h2 className="mt-2 text-[22px] font-extrabold tracking-tight">{titulo}</h2>
          {descricao && (
            <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-tinta-suave">{descricao}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-tinta-suave transition-colors hover:bg-papel hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
        >
          <IconeFechar className="h-5 w-5" />
        </button>
      </div>
      <div className="border-t border-borda px-6 py-6">{children}</div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-borda bg-superficie-sutil px-6 py-4">
        {rodape}
      </div>
    </dialog>
  );
}
