"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { acaoSair } from "../lib/auth/acoes";

const links = [
  { href: "/admin/cursos", rotulo: "Cursos" },
  { href: "/admin/usuarios", rotulo: "Usuários" },
];

export function NavAdmin({ nomeUsuario }: { nomeUsuario: string }) {
  const pathname = usePathname();

  return (
    <header className="flex h-14 w-full flex-none items-center justify-between gap-6 bg-azul-institucional px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-6">
        <span className="whitespace-nowrap font-serif text-[15px] font-semibold text-white">
          Horas Atividades
        </span>
        <nav className="flex gap-5 overflow-x-auto text-sm">
          {links.map((link) => {
            const estaAtivo = pathname.startsWith(link.href);
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
      <div className="flex flex-none items-center gap-3.5">
        <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-white/35 bg-white/[.16] px-2.5 py-1 text-xs font-medium text-white sm:inline-flex">
          <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-white" />
          Secretaria acadêmica
        </span>
        <span className="hidden whitespace-nowrap text-sm text-white/85 md:inline">{nomeUsuario}</span>
        <form action={acaoSair}>
          <button
            type="submit"
            className="whitespace-nowrap text-sm text-white underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
