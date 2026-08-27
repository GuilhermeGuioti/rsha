import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { listarUsuarios } from "../../../../../lib/services/usuarios";
import { ListaUsuarios } from "./lista-usuarios";

export default async function AdminUsuariosPage() {
  await exigirPerfil(Perfil.SECRETARIA);

  const usuarios = await listarUsuarios();

  return (
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
  );
}
