import { exigirPerfil } from "../../../lib/auth/guards";
import { Perfil } from "../../generated/prisma/client";
import { listarCursos } from "../../../lib/services/cursos";
import { prisma } from "../../../lib/db";
import { NavAdmin } from "../../../components/NavAdmin";
import { ListaCursos } from "./lista-cursos";

export default async function AdminCursosPage() {
  const sessao = await exigirPerfil(Perfil.SECRETARIA);

  const [cursos, usuariosAtivos, usuarioAtual] = await Promise.all([
    listarCursos(),
    prisma.usuario.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.usuario.findUniqueOrThrow({ where: { id: sessao.usuarioId } }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <NavAdmin ativo="cursos" nomeUsuario={usuarioAtual.nome} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <ListaCursos
          cursos={cursos.map((curso) => ({
            id: curso.id,
            nome: curso.nome,
            ativo: curso.ativo,
            avaliadorAlternativoId: curso.avaliadorAlternativoId,
            avaliadorAlternativoNome: curso.avaliadorAlternativo?.nome ?? null,
            coordenadores: curso.coordenadores.map((vinculo) => vinculo.coordenador.nome),
            totalDocentes: curso._count.docentes,
          }))}
          usuariosDisponiveis={usuariosAtivos.map((usuario) => ({ id: usuario.id, nome: usuario.nome }))}
        />
      </main>
    </div>
  );
}
