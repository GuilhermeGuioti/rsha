import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { listarCursos } from "../../../../../lib/services/cursos";
import { ListaCursos } from "./lista-cursos";

export default async function AdminCursosPage() {
  await exigirPerfil(Perfil.SECRETARIA);

  const cursos = await listarCursos();

  return (
    <ListaCursos
      cursos={cursos.map((curso) => ({
        id: curso.id,
        nome: curso.nome,
        ativo: curso.ativo,
        coordenadores: curso.coordenadores.map((vinculo) => vinculo.coordenador.nome),
        totalDocentes: curso._count.docentes,
      }))}
    />
  );
}
