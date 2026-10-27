import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { obterUsuario } from "../../../lib/auth/guards";
import { prisma } from "../../../lib/db";
import { classeTituloTela } from "../../../components/CabecalhoAdmin";
import { Cartao } from "../../../components/Cartao";
import { SeloIcone } from "../../../components/SeloIcone";
import { SituacaoPeriodoPill } from "../../../components/SituacaoPeriodo";
import { formatarData, saudacao } from "../../../lib/formato";
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

type ComponenteIcone = ComponentType<{ className?: string }>;
type Atalho = { href: string; titulo: string; descricao: string; Icone: ComponenteIcone };

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

// Tela de partida da secretaria (layout pedido em 2026-10-27): saudação solta
// sobre o papel, três indicadores do cadastro e, abaixo, Cadastros e Consultas
// lado a lado, cada um num cartão com as telas em linhas.
export async function HomeSecretaria({ usuarioId }: { usuarioId: number }) {
  const agora = new Date();
  const [usuario, cursosAtivos, usuariosAtivos, periodoAberto, periodoMaisRecente] = await Promise.all([
    obterUsuario(usuarioId),
    prisma.curso.count({ where: { ativo: true } }),
    prisma.usuario.count({ where: { ativo: true } }),
    prisma.periodoLetivo.findFirst({
      where: { aberturaSubmissao: { lte: agora }, encerramentoSubmissao: { gte: agora } },
      orderBy: [{ ano: "desc" }, { semestre: "desc" }],
    }),
    prisma.periodoLetivo.findFirst({ orderBy: [{ ano: "desc" }, { semestre: "desc" }] }),
  ]);
  // O período com entrega aberta tem prioridade sobre um semestre seguinte
  // já agendado; sem nenhum aberto, vale o mais recente.
  const periodo = periodoAberto ?? periodoMaisRecente;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h1 className={`${classeTituloTela} sm:text-[32px]`}>{saudacao(usuario.nome)}</h1>
        <p className="text-base text-tinta-suave sm:text-lg">Cadastros e consultas da secretaria acadêmica.</p>
      </div>

      <section aria-label="Resumo do cadastro" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Indicador rotulo="Cursos ativos" valor={cursosAtivos} Icone={IconeCursos} />
        <Indicador rotulo="Usuários ativos" valor={usuariosAtivos} Icone={IconeUsuarios} />
        <Indicador
          rotulo="Período letivo"
          valor={periodo ? `${periodo.ano}/${periodo.semestre}` : "—"}
          selo={periodo && <SituacaoPeriodoPill periodo={periodo} />}
          detalhe={
            periodo
              ? `${formatarData(periodo.aberturaSubmissao)} – ${formatarData(periodo.encerramentoSubmissao)}`
              : "Nenhum período cadastrado"
          }
          Icone={IconeCalendario}
        />
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <GrupoAtalhos titulo="Cadastros" descricao="O que a secretaria mantém a cada semestre." atalhos={CADASTROS} />
        <GrupoAtalhos
          titulo="Consultas"
          descricao="Situação das entregas e documentos já aprovados."
          atalhos={CONSULTAS}
        />
      </div>
    </div>
  );
}

function Indicador({
  rotulo,
  valor,
  detalhe,
  selo,
  Icone,
}: {
  rotulo: string;
  valor: number | string;
  detalhe?: string;
  selo?: ReactNode;
  Icone: ComponenteIcone;
}) {
  return (
    <Cartao className="flex items-center gap-5 p-5 sm:p-6">
      <span
        aria-hidden
        className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-azul-suave text-azul-interativo"
      >
        <Icone className="h-7 w-7" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[15px] font-semibold text-tinta">{rotulo}</p>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="font-mono text-[30px] leading-tight font-semibold tabular-nums text-tinta">{valor}</p>
          {selo}
        </div>
        {detalhe && <p className="font-mono text-[13px] font-medium text-tinta-suave">{detalhe}</p>}
      </div>
    </Cartao>
  );
}

function GrupoAtalhos({ titulo, descricao, atalhos }: { titulo: string; descricao: string; atalhos: Atalho[] }) {
  return (
    <Cartao como="section" className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-tinta sm:text-2xl">{titulo}</h2>
        <p className="text-[15px] text-tinta-suave">{descricao}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {atalhos.map(({ href, titulo: rotulo, descricao: detalhe, Icone }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex min-h-[84px] items-center gap-4 rounded-xl border border-borda px-3.5 py-3 transition-colors hover:border-azul-interativo hover:bg-superficie-sutil focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2"
            >
              <SeloIcone tamanho="xl" className="transition-colors group-hover:bg-azul-interativo group-hover:text-white">
                <Icone className="h-7 w-7" />
              </SeloIcone>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-base font-semibold text-tinta">{rotulo}</span>
                <span className="text-[13px] leading-snug text-tinta-suave sm:text-sm">{detalhe}</span>
              </span>
              <IconeChevron className="mr-1 h-5 w-5 flex-none text-tinta-suave transition-[translate,color] group-hover:translate-x-0.5 group-hover:text-azul-interativo" />
            </Link>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}
