import Link from "next/link";
import type { ComponentType } from "react";
import { obterUsuario } from "../../../lib/auth/guards";
import { CabecalhoAdmin, classeTituloSecao } from "../../../components/CabecalhoAdmin";
import { Cartao } from "../../../components/Cartao";
import { SeloIcone } from "../../../components/SeloIcone";
import { saudacao } from "../../../lib/formato";
import {
  IconeAcompanhamento,
  IconeArquivo,
  IconeCalendario,
  IconeChevron,
  IconeCursos,
  IconeUsuarios,
  IconeValidar,
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
  {
    href: "/validar",
    titulo: "Validar documento",
    descricao: "Confira se um relatório impresso foi emitido pelo SRHA.",
    Icone: IconeValidar,
  },
];

// Tela de partida da secretaria: não tem lista pra rolar, só os atalhos —
// um índice por grupo, lado a lado, em vez de um mosaico de cartões: a
// secretaria escolhe pelo nome e pela descrição, não pelo ícone.
export async function HomeSecretaria({ usuarioId }: { usuarioId: number }) {
  const usuario = await obterUsuario(usuarioId);

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoAdmin
        titulo={saudacao(usuario.nome)}
        subtitulo={<p className="text-[15px] text-tinta-suave">Cadastros e consultas da secretaria acadêmica.</p>}
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <GrupoAtalhos titulo="Cadastros" descricao="O que a secretaria mantém a cada semestre." atalhos={CADASTROS} />
        <GrupoAtalhos titulo="Consultas" descricao="Situação das entregas e documentos já aprovados." atalhos={CONSULTAS} />
      </div>
    </div>
  );
}

function GrupoAtalhos({ titulo, descricao, atalhos }: { titulo: string; descricao: string; atalhos: Atalho[] }) {
  return (
    <Cartao como="section" className="overflow-hidden">
      <div className="border-b border-borda px-5 py-4 sm:px-6">
        <h2 className={classeTituloSecao}>{titulo}</h2>
        <p className="mt-0.5 text-[13px] text-tinta-suave">{descricao}</p>
      </div>
      <ul className="divide-y divide-borda">
        {atalhos.map(({ href, titulo: rotulo, descricao: detalhe, Icone }) => (
          <li key={href}>
            {/* O fio verde-água à esquerda marca a linha sob o mouse ou o
                foco, como o sublinhado da página atual na barra. */}
            <Link
              href={href}
              className="group relative flex min-h-[76px] items-center gap-4 px-5 py-4 transition-colors hover:bg-superficie-sutil focus-visible:bg-superficie-sutil focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azul-interativo sm:px-6"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[3px] bg-acento-forte opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              />
              <SeloIcone className="transition-colors group-hover:bg-azul-interativo group-hover:text-white">
                <Icone className="h-[22px] w-[22px]" />
              </SeloIcone>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-tinta transition-colors group-hover:text-azul-interativo">
                  {rotulo}
                </span>
                <span className="text-[13px] leading-relaxed text-tinta-suave">{detalhe}</span>
              </span>
              <IconeChevron className="h-5 w-5 flex-none text-tinta-suave transition-[translate,color] group-hover:translate-x-0.5 group-hover:text-azul-interativo" />
            </Link>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}
