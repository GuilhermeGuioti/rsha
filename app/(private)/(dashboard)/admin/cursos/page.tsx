import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { listarCursos } from "../../../../../lib/services/cursos";
import { prisma } from "../../../../../lib/db";
import { ListaCursos } from "./lista-cursos";

export default async function AdminCursosPage() {
  await exigirPerfil(Perfil.SECRETARIA);

  const [cursos, usuariosAtivos] = await Promise.all([
    listarCursos(),
    prisma.usuario.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
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
  );
}
