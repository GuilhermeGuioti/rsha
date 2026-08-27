"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { acaoSair } from "../lib/auth/acoes";
import { Modal } from "./Modal";
import { BotaoSecundario } from "./BotaoSecundario";
import { Pill } from "./Pill";

export type LinkNav = { href: string; rotulo: string };

export function Nav({
  nomeUsuario,
  perfilRotulo,
  links,
}: {
  nomeUsuario: string;
  perfilRotulo: string;
  links: LinkNav[];
}) {
  const pathname = usePathname();
  const [contaAberta, setContaAberta] = useState(false);
  const inicial = nomeUsuario.trim().charAt(0).toUpperCase();

  return (
    <header className="flex h-16 w-full flex-none items-center justify-between gap-6 bg-azul-institucional px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-6">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-white/35 bg-white/[.16]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12,4 22,9 12,14 2,9" />
              <path d="M7 11.3v3.8c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-3.8" />
              <line x1="22" y1="9" x2="22" y2="15" />
              <circle cx="22" cy="16" r="1" fill="currentColor" stroke="none" />
            </svg>
          </span>
          {/* <span className="whitespace-nowrap font-serif text-[15px] font-semibold text-white">
            Horas Atividades
          </span> */}
        </div>
        <nav className="flex gap-5 overflow-x-auto text-[15px]">
          {links.map((link) => {
            const estaAtivo = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  estaAtivo
                    ? "whitespace-nowrap border-b-2 border-acento pb-[3px] font-medium text-white"
                    : "whitespace-nowrap pb-[3px] text-white/80 hover:text-white"
                }
              >
                {link.rotulo}
              </Link>
            );
          })}
        </nav>
      </div>
      <button
        type="button"
        onClick={() => setContaAberta(true)}
        aria-label={`Conta de ${nomeUsuario}`}
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-white/35 bg-white/[.16] font-serif text-base font-semibold text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {inicial}
      </button>

      <Modal
        aberto={contaAberta}
        eyebrow="CONTA"
        titulo={nomeUsuario}
        onFechar={() => setContaAberta(false)}
        rodape={
          <>
            <BotaoSecundario onClick={() => setContaAberta(false)}>Fechar</BotaoSecundario>
            <form action={acaoSair}>
              <button
                type="submit"
                className="flex min-h-11 items-center rounded-md border border-estado-devolvido px-5 text-[15px] font-medium text-estado-devolvido focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
              >
                Sair
              </button>
            </form>
          </>
        }
      >
        <Pill cor="neutro">{perfilRotulo}</Pill>
      </Modal>
    </header>
  );
}
