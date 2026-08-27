import { exigirSessaoPagina, obterPerfis } from "../../../lib/auth/guards";
import { prisma } from "../../../lib/db";
import { Perfil } from "../../../generated/prisma/enums";
import { Nav, type LinkNav } from "../../../components/Nav";

const ROTULOS_PERFIL: Record<Perfil, string> = {
  DOCENTE: "Docente",
  COORDENADOR: "Coordenação",
  SECRETARIA: "Secretaria acadêmica",
};

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const sessao = await exigirSessaoPagina();
  const [usuario, perfis] = await Promise.all([
    prisma.usuario.findUniqueOrThrow({ where: { id: sessao.usuarioId } }),
    obterPerfis(sessao.usuarioId),
  ]);

  // Os links são os mesmos do mockup — só muda o conjunto conforme o perfil.
  // A barra não substitui autorização: cada page faz o seu próprio guard.
  const links: LinkNav[] = [];
  if (perfis.includes(Perfil.DOCENTE)) {
    links.push({ href: "/", rotulo: "Meus relatórios" });
  }
  if (perfis.includes(Perfil.SECRETARIA)) {
    links.push(
      { href: "/admin/cursos", rotulo: "Cursos" },
      { href: "/admin/usuarios", rotulo: "Usuários" },
      { href: "/admin/vinculos", rotulo: "Vínculos" },
      { href: "/admin/periodos", rotulo: "Períodos" },
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Nav
        nomeUsuario={usuario.nome}
        perfilRotulo={perfis.map((perfil) => ROTULOS_PERFIL[perfil]).join(" · ")}
        links={links}
      />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}
