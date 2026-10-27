import Link from "next/link";
import type { ComponentType } from "react";
import { obterUsuario } from "../../../lib/auth/guards";
import { CabecalhoAdmin, classeTituloSecao } from "../../../components/CabecalhoAdmin";
import { classeCartao } from "../../../components/Cartao";
import { SeloIcone } from "../../../components/SeloIcone";
import { saudacao } from "../../../lib/formato";
import {
  IconeAcompanhamento,
  IconeArquivo,
  IconeCalendario,
  IconeCursos,
  IconeUsuarios,
  IconeVinculos,
} from "../../../components/Icones";

type Atalho = { href: string; titulo: string; descricao: string; Icone: ComponentType<{ className?: string }> };

const CADASTROS: Atalho[] = [
  { href: "/admin/cursos", titulo: "Cursos", descricao: "Cadastro de cursos.", Icone: IconeCursos },
  {
    href: "/admin/usuarios",
    titulo: "Usuários",
    descricao: "Pessoas com acesso ao sistema e seus perfis.",
    Icone: IconeUsuarios,
  },
  {
    href: "/admin/vinculos",
    titulo: "Vínculos",
    descricao: "Quem dá aula e quem coordena em cada curso.",
    Icone: IconeVinculos,
  },
  {
    href: "/admin/periodos",
    titulo: "Períodos letivos",
    descricao: "Prazos de submissão de cada semestre.",
    Icone: IconeCalendario,
  },
];

const CONSULTAS: Atalho[] = [
  {
    href: "/acompanhamento",
    titulo: "Acompanhamento",
    descricao: "Situação de entrega por curso no período corrente.",
    Icone: IconeAcompanhamento,
  },
  {
    href: "/arquivo",
    titulo: "Arquivo",
    descricao: "Relatórios aprovados, por ano, semestre e curso.",
    Icone: IconeArquivo,
  },
];

// Tela de partida da secretaria: não tem lista pra rolar, só os atalhos —
// cartões grandes, como os módulos do App do Dono.
export async function HomeSecretaria({ usuarioId }: { usuarioId: number }) {
  const usuario = await obterUsuario(usuarioId);

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoAdmin
        titulo={saudacao(usuario.nome)}
        subtitulo={<p className="text-[15px] text-tinta-suave">Cadastros e consultas da secretaria acadêmica.</p>}
      />
      <GrupoAtalhos titulo="Cadastros" atalhos={CADASTROS} />
      <GrupoAtalhos titulo="Consultas" atalhos={CONSULTAS} />
    </div>
  );
}

function GrupoAtalhos({ titulo, atalhos }: { titulo: string; atalhos: Atalho[] }) {
  return (
    <section className="flex flex-col gap-4">
      <CabecalhoAdmin nivel={2} titulo={titulo} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {atalhos.map(({ href, titulo: rotulo, descricao, Icone }) => (
          <Link
            key={href}
            href={href}
            className={`group flex min-h-[168px] flex-col gap-5 p-6 transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-azul-interativo hover:shadow-cartao-elevado focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2 ${classeCartao}`}
          >
            <SeloIcone
              tamanho="xl"
              className="transition-colors group-hover:bg-azul-interativo group-hover:text-white"
            >
              <Icone className="h-7 w-7" />
            </SeloIcone>
            <span className="flex flex-col gap-1.5">
              <span className={classeTituloSecao}>{rotulo}</span>
              <span className="text-[13px] leading-relaxed text-tinta-suave">{descricao}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
