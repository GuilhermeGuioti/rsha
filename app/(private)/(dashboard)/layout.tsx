import { exigirSessaoPagina, obterPerfis, obterUsuario } from "../../../lib/auth/guards";
import { Perfil } from "../../../generated/prisma/enums";
import { Nav, type LinkNav } from "../../../components/Nav";
import { BotaoVoltar } from "../../../components/BotaoVoltar";

const ROTULOS_PERFIL: Record<Perfil, string> = {
  DOCENTE: "Docente",
  COORDENADOR: "Coordenação",
  SECRETARIA: "Secretaria acadêmica",
};

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const sessao = await exigirSessaoPagina();
  const [usuario, perfis] = await Promise.all([
    obterUsuario(sessao.usuarioId),
    obterPerfis(sessao.usuarioId),
  ]);

  // Os links são os mesmos do mockup — só muda o conjunto conforme o perfil.
  // A barra não substitui autorização: cada page faz o seu próprio guard.
  const links: LinkNav[] = [];
  if (perfis.includes(Perfil.DOCENTE)) {
    links.push({ href: "/", rotulo: "Meus relatórios" });
  }
  if (perfis.includes(Perfil.COORDENADOR)) {
    links.push({ href: "/avaliacao", rotulo: "Fila de avaliação" });
    links.push({ href: "/acompanhamento", rotulo: "Acompanhamento" });
  }
  // Secretaria também acompanha (mesmo perfil de acesso de /acompanhamento),
  // mas segue a mesma regra do /arquivo logo abaixo: sem link na barra,
  // atalho no hub (ver HomeSecretaria).
  // /arquivo é "todos" na tabela de rotas, mas quem só tem perfil secretaria
  // não tem barra com links de conteúdo — o atalho fica no hub (ver
  // HomeSecretaria), junto dos outros cadastros. Docente e/ou coordenador
  // ganham o link aqui mesmo.
  if (perfis.includes(Perfil.DOCENTE) || perfis.includes(Perfil.COORDENADOR)) {
    links.push({ href: "/arquivo", rotulo: "Arquivo" });
  }
  // Secretaria não tem links de admin na barra — o logo leva pro "/", que já
  // mostra os atalhos grandes (HomeSecretaria). Um menu duplicado ali só
  // adicionaria ruído.

  // A tela inicial de cada perfil, a mesma que o "/" escolhe (ver page.tsx):
  // coordenador que não é docente cai direto na fila. Nela não há "Voltar".
  const inicio = !perfis.includes(Perfil.DOCENTE) && perfis.includes(Perfil.COORDENADOR) ? "/avaliacao" : "/";

  return (
    <div className="flex flex-1 flex-col">
      <Nav
        nomeUsuario={usuario.nome}
        emailUsuario={usuario.email}
        perfilRotulo={perfis.map((perfil) => ROTULOS_PERFIL[perfil]).join(" · ")}
        links={links}
      />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <BotaoVoltar inicio={inicio} />
        {children}
      </main>
    </div>
  );
}
