import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoAoRelatorio } from "../../../../../lib/auth/guards";
import { prisma } from "../../../../../lib/db";
import { SituacaoRelatorio } from "../../../../../generated/prisma/enums";
import { codigoRelatorio, formatarDataHora } from "../../../../../lib/formato";
import { SituacaoPill } from "../../../../../components/SituacaoPill";
import { TrilhaAuditoria } from "../../../../../components/TrilhaAuditoria";
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
    <div className="flex flex-col gap-5">
      <nav className="flex items-center gap-2 text-[13px] text-tinta-suave">
        <Link href="/avaliacao" className="text-azul-interativo">
          Fila de avaliação
        </Link>
        <span aria-hidden>›</span>
        <span>{relatorio.curso.nome}</span>
        <span aria-hidden>›</span>
        <span>{relatorio.docente.nome}</span>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 rounded-md border border-borda bg-superficie p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-borda pb-5">
              <div>
                <div className="font-mono text-xs font-medium tracking-[.1em] text-tinta-suave">
                  {codigoRelatorio(relatorio.periodo.ano, relatorio.periodo.semestre, relatorio.id)}
                </div>
                <h1 className="mt-2 font-serif text-2xl font-semibold text-azul-interativo">
                  {relatorio.docente.nome}
                </h1>
                <p className="mt-1.5 text-[15px] text-tinta-suave">
                  {relatorio.curso.nome} · {relatorio.periodo.semestre}º semestre de {relatorio.periodo.ano}
                </p>
              </div>
              <div className="text-right">
                <SituacaoPill situacao={relatorio.situacao} />
                {relatorio.situacao === SituacaoRelatorio.AGUARDANDO_AVALIACAO && (
                  <p className="mt-2.5 text-[13px] text-tinta-suave">
                    esperando há{" "}
                    <span className="font-mono font-medium text-tinta">
                      {diasEsperando <= 0 ? "menos de 1 dia" : diasEsperando === 1 ? "1 dia" : `${diasEsperando} dias`}
                    </span>
                  </p>
                )}
              </div>
            </div>

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
          </div>

          {relatorio.situacao === SituacaoRelatorio.AGUARDANDO_AVALIACAO && (
            <PainelDecisao relatorioId={relatorio.id} />
          )}
        </div>

        <TrilhaAuditoria eventos={relatorio.eventos} cargaHorariaTotal={relatorio.cargaHorariaTotal.toNumber()} />
      </div>
    </div>
  );
}
