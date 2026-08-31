import { redirect } from "next/navigation";
import { exigirSessaoPagina, obterPerfis } from "../../../lib/auth/guards";
import { Perfil } from "../../../generated/prisma/enums";
import { HomeDocente } from "./home-docente";
import { HomeSecretaria } from "./home-secretaria";

// "/" não é uma tela única: cada perfil tem um destino que faz sentido pra
// ele. Docente ganha prioridade por ser o caso mais comum (302 vs. 17
// coordenadores) — quem acumula os dois perfis no mesmo curso cai no próprio
// relatório e chega na fila pelo nav. Coordenador puro vai direto pra fila,
// que é trabalho pendente. Secretaria não preenche nem avalia relatório —
// aqui ganha os atalhos de cadastro.
export default async function Home() {
  const sessao = await exigirSessaoPagina();
  const perfis = await obterPerfis(sessao.usuarioId);

  if (perfis.includes(Perfil.DOCENTE)) {
    return <HomeDocente usuarioId={sessao.usuarioId} />;
  }
  if (perfis.includes(Perfil.COORDENADOR)) {
    redirect("/avaliacao");
  }
  if (perfis.includes(Perfil.SECRETARIA)) {
    return <HomeSecretaria />;
  }

  return (
    <p className="text-[15px] text-tinta-suave">
      Seu usuário ainda não tem nenhum perfil ou vínculo cadastrado. Procure a secretaria acadêmica.
    </p>
  );
}
