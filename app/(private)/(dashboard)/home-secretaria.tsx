import Link from "next/link";

const ATALHOS: { href: string; titulo: string; descricao: string }[] = [
  { href: "/admin/cursos", titulo: "Cursos", descricao: "Cadastro de cursos." },
  { href: "/admin/usuarios", titulo: "Usuários", descricao: "Pessoas com acesso ao sistema e seus perfis." },
  { href: "/admin/vinculos", titulo: "Vínculos", descricao: "Quem dá aula e quem coordena em cada curso." },
  { href: "/admin/periodos", titulo: "Períodos letivos", descricao: "Prazos de submissão de cada semestre." },
  { href: "/arquivo", titulo: "Arquivo", descricao: "Relatórios aprovados, por ano, semestre e curso." },
];

// Tela de partida da secretaria: não tem lista pra rolar, só os atalhos —
// por isso centralizada como se fosse um launcher, não uma tela de admin.
export function HomeSecretaria() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 py-10 text-center">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-azul-interativo">Administração</h1>
        <p className="mt-1.5 text-[15px] text-tinta-suave">Cadastros mantidos pela secretaria acadêmica.</p>
      </div>
      <div className="grid w-full max-w-[760px] gap-5 sm:grid-cols-2">
        {ATALHOS.map((atalho) => (
          <Link
            key={atalho.href}
            href={atalho.href}
            className="flex min-h-[148px] flex-col justify-between gap-3 rounded-md border border-borda bg-superficie p-6 text-left transition-colors hover:border-azul-interativo hover:bg-[#e9f6fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-interativo"
          >
            <h2 className="font-serif text-lg font-semibold text-azul-interativo">{atalho.titulo}</h2>
            <p className="text-[13px] leading-relaxed text-tinta-suave">{atalho.descricao}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
