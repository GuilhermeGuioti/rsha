import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { listarPeriodos } from "../../../../../lib/services/periodos";
import { ListaPeriodos } from "./lista-periodos";

export default async function AdminPeriodosPage() {
  await exigirPerfil(Perfil.SECRETARIA);

  const periodos = await listarPeriodos();

  return (
    <ListaPeriodos
      periodos={periodos.map((periodo) => ({
        id: periodo.id,
        ano: periodo.ano,
        semestre: periodo.semestre,
        aberturaSubmissao: periodo.aberturaSubmissao.toISOString(),
        encerramentoSubmissao: periodo.encerramentoSubmissao.toISOString(),
      }))}
    />
  );
}
