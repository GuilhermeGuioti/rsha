"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { acaoSair } from "../lib/auth/acoes";
import { IconeSair } from "./Icones";
import { LogoInstitucional } from "./MarcaInstitucional";
import { Pill } from "./Pill";

export type LinkNav = { href: string; rotulo: string };

const ID_MENU_CONTA = "menu-conta";

export function Nav({
  nomeUsuario,
  emailUsuario,
  perfilRotulo,
  links,
}: {
  nomeUsuario: string;
  emailUsuario: string;
  perfilRotulo: string;
  links: LinkNav[];
}) {
  const pathname = usePathname();
  const inicial = nomeUsuario.trim().charAt(0).toUpperCase();

  return (
    <header className="w-full flex-none border-b border-borda bg-superficie">
      {/* Fio nas duas cores do logo: a assinatura da barra em todas as telas. */}
      <div aria-hidden className="h-[3px] [background-image:var(--faixa-marca)]" />
      {/* No celular os links descem para uma segunda linha rolável; do md
          para cima ficam entre o logo e a conta. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          aria-label="Ir para o início"
          className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
        >
          <LogoInstitucional tamanho="sm" />
          {/* <span className="whitespace-nowrap text-[15px] font-bold tracking-tight text-tinta">
            Horas Atividades
          </span> */}
        </Link>

        <nav aria-label="Principal" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 pb-1 md:order-none md:mx-0 md:w-auto md:flex-1 md:px-0 md:pb-0">
          {links.map((link) => {
            const estaAtivo = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={estaAtivo ? "page" : undefined}
                className={`relative flex min-h-11 items-center whitespace-nowrap rounded-lg px-3.5 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo ${
                  estaAtivo
                    ? "font-semibold text-azul-interativo after:absolute after:inset-x-3.5 after:bottom-0.5 after:h-[3px] after:rounded-full after:bg-acento-forte"
                    : "font-medium text-tinta-suave hover:bg-papel hover:text-tinta"
                }`}
              >
                {link.rotulo}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          popoverTarget={ID_MENU_CONTA}
          aria-label={`Conta de ${nomeUsuario}`}
          className="ml-auto flex min-h-11 flex-none items-center gap-3 rounded-full p-0.5 text-left transition-colors hover:bg-papel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo lg:pl-4"
        >
          <span className="hidden flex-col items-end leading-tight lg:flex">
            <span className="text-[13px] font-semibold text-tinta">{nomeUsuario}</span>
            <span className="text-[13px] text-tinta-suave">{perfilRotulo}</span>
          </span>
          <Avatar inicial={inicial} className="h-10 w-10 shadow-botao" />
        </button>

        {/* Popover nativo: fecha com Esc e com clique fora, sem estado em
            React. A barra ocupa a largura toda, então o canto direito da
            tela é sempre o canto do botão da conta. */}
        <div
          id={ID_MENU_CONTA}
          popover="auto"
          className="inset-auto top-[71px] right-4 m-0 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-borda bg-superficie p-0 text-tinta shadow-flutuante open:animate-surgir sm:right-6"
        >
          <div className="flex items-center gap-3 border-b border-borda px-4 py-4">
            <Avatar inicial={inicial} className="h-11 w-11" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{nomeUsuario}</p>
              <p className="truncate font-mono text-[13px] text-tinta-suave">{emailUsuario}</p>
            </div>
          </div>
          <div className="border-b border-borda px-4 py-3">
            <Pill cor="neutro">{perfilRotulo}</Pill>
          </div>
          <form action={acaoSair} className="p-2">
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-[15px] font-semibold text-estado-devolvido transition-colors hover:bg-estado-devolvido-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
            >
              <IconeSair className="h-5 w-5" />
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function Avatar({ inicial, className }: { inicial: string; className: string }) {
  return (
    <span
      aria-hidden
      className={`flex flex-none items-center justify-center rounded-full bg-azul-interativo text-base font-semibold text-white ${className}`}
    >
      {inicial}
    </span>
  );
}
