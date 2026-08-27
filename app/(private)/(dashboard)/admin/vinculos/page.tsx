import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { prisma } from "../../../../../lib/db";
import { listarPeriodos } from "../../../../../lib/services/periodos";
import { listarVinculosDocente, listarVinculosCoordenador } from "../../../../../lib/services/vinculos";
import { ListaVinculos } from "./lista-vinculos";

export default async function AdminVinculosPage() {
  await exigirPerfil(Perfil.SECRETARIA);

  const [periodos, vinculosDocente, vinculosCoordenador, cursosAtivos, usuariosAtivos] = await Promise.all([
    listarPeriodos(),
    listarVinculosDocente(),
    listarVinculosCoordenador(),
    prisma.curso.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.usuario.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <ListaVinculos
      periodos={periodos.map((periodo) => ({ id: periodo.id, rotulo: `${periodo.ano}/${periodo.semestre}` }))}
      vinculosDocente={vinculosDocente.map((vinculo) => ({
        id: vinculo.id,
        periodoLetivoId: vinculo.periodoLetivoId,
        cursoId: vinculo.cursoId,
        cursoNome: vinculo.curso.nome,
        docenteId: vinculo.docenteId,
        docenteNome: vinculo.docente.nome,
      }))}
      vinculosCoordenador={vinculosCoordenador.map((vinculo) => ({
        id: vinculo.id,
        cursoId: vinculo.cursoId,
        cursoNome: vinculo.curso.nome,
        coordenadorId: vinculo.coordenadorId,
        coordenadorNome: vinculo.coordenador.nome,
      }))}
      cursos={cursosAtivos.map((curso) => ({ id: curso.id, nome: curso.nome }))}
      usuarios={usuariosAtivos.map((usuario) => ({ id: usuario.id, nome: usuario.nome }))}
    />
  );
}
