import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { listarTiposAtividade } from "../../../../../lib/services/tipos-atividade";
import { ListaTiposAtividade } from "./lista-tipos-atividade";

export default async function AdminTiposAtividadePage() {
  await exigirPerfil(Perfil.SECRETARIA);

  const tipos = await listarTiposAtividade();

  return (
    <ListaTiposAtividade
      tipos={tipos.map((tipo) => ({
        id: tipo.id,
        descricao: tipo.descricao,
        ativo: tipo.ativo,
        totalItens: tipo._count.itens,
      }))}
    />
  );
}
