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
  IconeChevron,
  IconeCursos,
  IconeUsuarios,
  IconeValidar,
  IconeVinculos,
} from "../../../components/Icones";

// `tarefas` é o que a tela de destino deixa fazer, para a secretaria achar o
// atalho pelo trabalho que tem em mãos e não só pelo nome da tela.
type Atalho = {
  href: string;
  titulo: string;
  descricao: string;
  tarefas: string[];
  Icone: ComponentType<{ className?: string }>;
};

const CADASTROS: Atalho[] = [
  {
    href: "/admin/cursos",
    titulo: "Cursos",
    descricao: "Cada curso gera um relatório por docente e por semestre.",
    tarefas: ["Cadastrar e editar cursos", "Importar de planilha", "Inativar sem perder o histórico"],
    Icone: IconeCursos,
  },
  {
    href: "/admin/usuarios",
    titulo: "Usuários",
    descricao: "Pessoas com acesso ao sistema e seus perfis.",
    tarefas: ["Cadastrar pelo e-mail institucional", "Importar de planilha", "Dar o perfil de secretaria ou inativar"],
    Icone: IconeUsuarios,
  },
  {
    href: "/admin/vinculos",
    titulo: "Vínculos",
    descricao: "Quem dá aula e quem coordena em cada curso.",
    tarefas: ["Docentes por curso, a cada período", "Coordenadores por curso", "Importar de planilha"],
    Icone: IconeVinculos,
  },
  {
    href: "/admin/periodos",
    titulo: "Períodos letivos",
    descricao: "Prazos de submissão de cada semestre.",
    tarefas: ["Cadastrar o semestre", "Definir abertura e encerramento da entrega", "Ajustar um prazo já cadastrado"],
    Icone: IconeCalendario,
  },
];

const CONSULTAS: Atalho[] = [
  {
    href: "/acompanhamento",
    titulo: "Acompanhamento",
    descricao: "Situação de entrega por curso no período corrente.",
    tarefas: ["Ver quem ainda não iniciou", "Contar as entregas por situação", "Extrair a planilha do período"],
    Icone: IconeAcompanhamento,
  },
  {
    href: "/arquivo",
    titulo: "Arquivo",
    descricao: "Relatórios aprovados, por ano, semestre e curso.",
    tarefas: ["Filtrar por ano, semestre e curso", "Abrir o relatório e a trilha", "Baixar o PDF do aprovado"],
    Icone: IconeArquivo,
  },
  {
    href: "/validar",
    titulo: "Validar documento",
    descricao: "Confira se um relatório impresso foi emitido pelo SRHA.",
    tarefas: ["Anexar o PDF recebido", "Ou digitar o código de autenticidade", "Comparar com o resumo oficial"],
    Icone: IconeValidar,
  },
];

// Tela de partida da secretaria: não tem lista pra rolar, só os atalhos —
// cartões largos, com o que cada tela deixa fazer, ocupando a largura toda.
export async function HomeSecretaria({ usuarioId }: { usuarioId: number }) {
  const usuario = await obterUsuario(usuarioId);

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoAdmin
        titulo={saudacao(usuario.nome)}
        subtitulo={<p className="text-[15px] text-tinta-suave">Cadastros e consultas da secretaria acadêmica.</p>}
      />
      <GrupoAtalhos titulo="Cadastros" atalhos={CADASTROS} colunas="sm:grid-cols-2 2xl:grid-cols-4" />
      <GrupoAtalhos titulo="Consultas" atalhos={CONSULTAS} colunas="sm:grid-cols-2 lg:grid-cols-3" />
    </div>
  );
}

function GrupoAtalhos({ titulo, atalhos, colunas }: { titulo: string; atalhos: Atalho[]; colunas: string }) {
  return (
    <section className="flex flex-col gap-4">
      <CabecalhoAdmin nivel={2} titulo={titulo} />
      <div className={`grid grid-cols-1 gap-5 ${colunas}`}>
        {atalhos.map((atalho) => (
          <CartaoAtalho key={atalho.href} atalho={atalho} />
        ))}
      </div>
    </section>
  );
}

// O link é só o título — o nome acessível fica curto —, esticado por um
// ::after sobre o cartão inteiro, então qualquer ponto dele leva à tela. O
// anel de foco vai no cartão, via has-[:focus-visible].
function CartaoAtalho({ atalho: { href, titulo, descricao, tarefas, Icone } }: { atalho: Atalho }) {
  return (
    <article
      className={`group relative flex flex-col transition-[box-shadow,border-color] duration-300 hover:border-azul-interativo hover:shadow-cartao-elevado has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul-interativo has-[:focus-visible]:ring-offset-2 ${classeCartao}`}
    >
      <div className="flex items-start gap-4 p-6 pb-5">
        <SeloIcone tamanho="lg" className="transition-colors group-hover:bg-azul-interativo group-hover:text-white">
          <Icone className="h-6 w-6" />
        </SeloIcone>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className={classeTituloSecao}>
            <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
              {titulo}
            </Link>
          </h3>
          <p className="text-[13px] leading-relaxed text-tinta-suave">{descricao}</p>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-2 border-t border-borda px-6 py-4">
        {tarefas.map((tarefa) => (
          <li key={tarefa} className="flex items-baseline gap-2.5 text-[13px] text-tinta">
            <span aria-hidden className="h-0.5 w-3 flex-none translate-y-[-3px] rounded-full bg-acento-forte" />
            {tarefa}
          </li>
        ))}
      </ul>
      <div
        aria-hidden
        className="flex min-h-12 items-center justify-between rounded-b-2xl border-t border-borda bg-superficie-sutil px-6 text-[13px] font-semibold text-azul-interativo"
      >
        Abrir
        <IconeChevron className="h-4 w-4 transition-[translate] group-hover:translate-x-0.5" />
      </div>
    </article>
  );
}
