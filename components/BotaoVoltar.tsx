"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconeChevron } from "./Icones";

// Fica no layout do (dashboard), que não remonta entre navegações — então a
// pilha abaixo é o caminho percorrido dentro do sistema nesta aba. Só com
// tela anterior conhecida o botão usa o histórico do navegador; página aberta
// direto (link, favorito, aba nova) vai para a tela-mãe, em vez de sair do
// sistema ou voltar para o login.
export function BotaoVoltar({ inicio }: { inicio: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const pilha = useRef<string[]>([]);

  useEffect(() => {
    const caminho = pilha.current;
    // O StrictMode roda o efeito duas vezes na montagem.
    if (caminho.at(-1) === pathname) return;
    if (caminho.at(-2) === pathname) {
      caminho.pop();
    } else {
      caminho.push(pathname);
    }
  }, [pathname]);

  if (pathname === "/" || pathname === inicio) {
    return null;
  }

  function voltar() {
    if (pilha.current.length > 1) {
      router.back();
    } else {
      router.push(pathname.startsWith("/avaliacao/") ? "/avaliacao" : inicio);
    }
  }

  return (
    <button
      type="button"
      onClick={voltar}
      className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-[15px] font-medium text-azul-interativo hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
    >
      <IconeChevron className="h-4 w-4 rotate-180" />
      Voltar
    </button>
  );
}
