import Link from "next/link";
import { CabecalhoAdmin } from "../../../components/CabecalhoAdmin";

const ATALHOS: { href: string; titulo: string; descricao: string }[] = [
  { href: "/admin/cursos", titulo: "Cursos", descricao: "Cadastro de cursos e avaliador alternativo." },
  { href: "/admin/usuarios", titulo: "Usuários", descricao: "Pessoas com acesso ao sistema e seus perfis." },
  { href: "/admin/vinculos", titulo: "Vínculos", descricao: "Quem dá aula e quem coordena em cada curso." },
  { href: "/admin/periodos", titulo: "Períodos letivos", descricao: "Prazos de submissão de cada semestre." },
];

export function HomeSecretaria() {
  return (
    <div className="flex flex-col gap-5">
      <CabecalhoAdmin
        titulo="Administração"
        subtitulo={<p className="text-[15px] text-tinta-suave">Cadastros mantidos pela secretaria acadêmica.</p>}
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {ATALHOS.map((atalho) => (
          <Link
            key={atalho.href}
            href={atalho.href}
            className="flex min-h-[148px] flex-col justify-between gap-3 rounded-md border border-borda bg-superficie p-6 transition-colors hover:border-azul-interativo hover:bg-[#e9f6fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
          >
            <h2 className="font-serif text-lg font-semibold text-azul-interativo">{atalho.titulo}</h2>
            <p className="text-[13px] leading-relaxed text-tinta-suave">{atalho.descricao}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
