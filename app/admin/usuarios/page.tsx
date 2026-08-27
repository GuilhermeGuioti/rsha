import { exigirPerfil } from "../../../lib/auth/guards";
import { Perfil } from "../../generated/prisma/client";
import { listarUsuarios } from "../../../lib/services/usuarios";
import { prisma } from "../../../lib/db";
import { NavAdmin } from "../../../components/NavAdmin";
import { ListaUsuarios } from "./lista-usuarios";

export default async function AdminUsuariosPage() {
  const sessao = await exigirPerfil(Perfil.SECRETARIA);

  const [usuarios, usuarioAtual] = await Promise.all([
    listarUsuarios(),
    prisma.usuario.findUniqueOrThrow({ where: { id: sessao.usuarioId } }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <NavAdmin ativo="usuarios" nomeUsuario={usuarioAtual.nome} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <ListaUsuarios
          usuarios={usuarios.map((usuario) => ({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            ativo: usuario.ativo,
            secretaria: usuario.perfis.some((perfil) => perfil.perfil === Perfil.SECRETARIA),
            perfis: usuario.perfis.map((perfil) => perfil.perfil),
            // Coordenador que também dá aula no próprio curso (RF22) tem vínculo duplo
            // no mesmo curso — a coluna mostra o curso uma vez só, o papel já está em Perfil.
            cursos: [
              ...new Set([
                ...usuario.vinculosDocente.map((vinculo) => vinculo.curso.nome),
                ...usuario.vinculosCoordenador.map((vinculo) => vinculo.curso.nome),
              ]),
            ],
          }))}
        />
      </main>
    </div>
  );
}
