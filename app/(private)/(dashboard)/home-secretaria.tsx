import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { obterUsuario } from "../../../lib/auth/guards";
import { prisma } from "../../../lib/db";
import { CabecalhoAdmin } from "../../../components/CabecalhoAdmin";
import { Cartao, classeCartao } from "../../../components/Cartao";
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

// Tela de partida da secretaria: três indicadores do cadastro no topo (a
// pedido, 2026-10-27) e, abaixo, os atalhos para cada tela.
export async function HomeSecretaria({ usuarioId }: { usuarioId: number }) {
  const agora = new Date();
  const [usuario, cursosAtivos, cursos, usuariosAtivos, usuarios, periodoAberto, periodoMaisRecente] =
    await Promise.all([
      obterUsuario(usuarioId),
      prisma.curso.count({ where: { ativo: true } }),
      prisma.curso.count(),
      prisma.usuario.count({ where: { ativo: true } }),
      prisma.usuario.count(),
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
    <div className="flex flex-col gap-8">
      <CabecalhoAdmin
        titulo={saudacao(usuario.nome)}
        subtitulo={<p className="text-[15px] text-tinta-suave">Cadastros e consultas da secretaria acadêmica.</p>}
      />

      <section aria-label="Resumo do cadastro" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Indicador
          rotulo="Cursos ativos"
          valor={cursosAtivos}
          detalhe={`de ${cursos} cadastrados`}
          Icone={IconeCursos}
        />
        <Indicador
          rotulo="Usuários ativos"
          valor={usuariosAtivos}
          detalhe={`de ${usuarios} cadastrados`}
          Icone={IconeUsuarios}
        />
        <Indicador
          rotulo="Período letivo"
          valor={periodo ? `${periodo.ano}/${periodo.semestre}` : "—"}
          selo={periodo && <SituacaoPeriodoPill periodo={periodo} />}
          detalhe={
            periodo
              ? `Entrega de ${formatarData(periodo.aberturaSubmissao)} a ${formatarData(periodo.encerramentoSubmissao)}`
              : "Nenhum período cadastrado"
          }
          Icone={IconeCalendario}
        />
      </section>

      <GrupoAtalhos titulo="Cadastros" atalhos={CADASTROS} colunas="sm:grid-cols-2 xl:grid-cols-4" />
      <GrupoAtalhos titulo="Consultas" atalhos={CONSULTAS} colunas="sm:grid-cols-2 lg:grid-cols-3" />
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
  detalhe: string;
  selo?: ReactNode;
  Icone: ComponenteIcone;
}) {
  return (
    <Cartao className="flex items-start gap-4 p-5 sm:p-6">
      <SeloIcone tamanho="lg">
        <Icone className="h-6 w-6" />
      </SeloIcone>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* min-h da altura do selo: com ou sem ele, os números dos três
            indicadores ficam na mesma linha. */}
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-[13px] font-semibold text-tinta-suave">{rotulo}</p>
          {selo}
        </div>
        <p className="mt-1 font-mono text-[28px] leading-tight font-semibold tabular-nums text-tinta">{valor}</p>
        <p className="mt-1 text-[13px] text-tinta-suave">{detalhe}</p>
      </div>
    </Cartao>
  );
}

function GrupoAtalhos({ titulo, atalhos, colunas }: { titulo: string; atalhos: Atalho[]; colunas: string }) {
  return (
    <section className="flex flex-col gap-4">
      <CabecalhoAdmin nivel={2} titulo={titulo} />
      <div className={`grid grid-cols-1 gap-5 ${colunas}`}>
        {atalhos.map(({ href, titulo: rotulo, descricao, Icone }) => (
          <Link
            key={href}
            href={href}
            className={`group flex min-h-24 items-center gap-4 p-5 transition-[box-shadow,border-color] duration-300 hover:border-azul-interativo hover:shadow-cartao-elevado focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo focus-visible:ring-offset-2 ${classeCartao}`}
          >
            <SeloIcone tamanho="lg" className="transition-colors group-hover:bg-azul-interativo group-hover:text-white">
              <Icone className="h-6 w-6" />
            </SeloIcone>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[15px] font-bold tracking-tight text-tinta">{rotulo}</span>
              <span className="text-[13px] leading-snug text-tinta-suave">{descricao}</span>
            </span>
            <IconeChevron className="h-5 w-5 flex-none text-tinta-suave transition-[translate,color] group-hover:translate-x-0.5 group-hover:text-azul-interativo" />
          </Link>
        ))}
      </div>
    </section>
  );
}
