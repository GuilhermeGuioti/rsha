import { notFound } from "next/navigation";
import { exigirAcessoAoRelatorio } from "../../../../../lib/auth/guards";
import { prisma } from "../../../../../lib/db";
import { SituacaoRelatorio } from "../../../../../generated/prisma/enums";
import { codigoRelatorio, formatarDataHora } from "../../../../../lib/formato";
import { SituacaoPill } from "../../../../../components/SituacaoPill";
import { TelaRelatorio } from "../../../../../components/TelaRelatorio";
import { FormularioRelatorio } from "../../relatorios/[id]/formulario-relatorio";
import { PainelDecisao } from "./painel-decisao";

export default async function AvaliacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const relatorioId = Number((await params).id);
  if (!Number.isInteger(relatorioId)) {
    notFound();
  }

  // "avaliar" identifica quem é o avaliador responsável, independente da
  // situação atual — é o mesmo guard usado para aprovar/devolver.
  await exigirAcessoAoRelatorio(relatorioId, "avaliar");

  const relatorio = await prisma.relatorio.findUniqueOrThrow({
    where: { id: relatorioId },
    include: {
      docente: true,
      curso: true,
      periodo: true,
      itens: { orderBy: { id: "asc" } },
      eventos: { include: { usuario: true }, orderBy: { ocorridoEm: "desc" } },
    },
  });

  const tipos = await prisma.tipoAtividade.findMany({
    where: { OR: [{ ativo: true }, { itens: { some: { relatorioId } } }] },
    orderBy: { descricao: "asc" },
  });

  const agora = new Date();
  const diasEsperando = Math.floor((agora.getTime() - relatorio.eventos[0].ocorridoEm.getTime()) / 86_400_000);

  return (
    <TelaRelatorio
      caminho={[
        { rotulo: "Fila de avaliação", href: "/avaliacao" },
        { rotulo: relatorio.curso.nome },
        { rotulo: relatorio.docente.nome },
      ]}
      codigo={codigoRelatorio(relatorio.periodo.ano, relatorio.periodo.semestre, relatorio.id)}
      titulo={relatorio.docente.nome}
      subtitulo={`${relatorio.curso.nome} · ${relatorio.periodo.semestre}º semestre de ${relatorio.periodo.ano}`}
      situacao={
        <>
          <SituacaoPill situacao={relatorio.situacao} />
          {relatorio.situacao === SituacaoRelatorio.AGUARDANDO_AVALIACAO && (
            <p className="text-[13px] text-tinta-suave">
              esperando há{" "}
              <span className="font-mono font-medium text-tinta">
                {diasEsperando <= 0 ? "menos de 1 dia" : diasEsperando === 1 ? "1 dia" : `${diasEsperando} dias`}
              </span>
            </p>
          )}
        </>
      }
      eventos={relatorio.eventos}
      cargaHorariaTotal={relatorio.cargaHorariaTotal.toNumber()}
      depois={
        relatorio.situacao === SituacaoRelatorio.AGUARDANDO_AVALIACAO && <PainelDecisao relatorioId={relatorio.id} />
      }
    >
      <FormularioRelatorio
        relatorioId={relatorio.id}
        somenteLeitura
        atualizadoEm={formatarDataHora(relatorio.atualizadoEm)}
        tipos={tipos.map((tipo) => ({ id: tipo.id, descricao: tipo.descricao }))}
        itensIniciais={relatorio.itens.map((item) => ({
          tipoAtividadeId: item.tipoAtividadeId,
          horas: item.horas.toNumber(),
          diaSemana: item.diaSemana,
          horario: item.horario,
          descricao: item.descricao,
        }))}
      />
    </TelaRelatorio>
  );
}
