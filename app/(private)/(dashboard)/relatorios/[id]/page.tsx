import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoAoRelatorio } from "../../../../../lib/auth/guards";
import { prisma } from "../../../../../lib/db";
import { SituacaoRelatorio, TipoEvento } from "../../../../../generated/prisma/enums";
import { codigoRelatorio, formatarDataHora } from "../../../../../lib/formato";
import { SituacaoPill } from "../../../../../components/SituacaoPill";
import { TrilhaAuditoria } from "../../../../../components/TrilhaAuditoria";
import { FormularioRelatorio } from "./formulario-relatorio";

export default async function RelatorioPage({ params }: { params: Promise<{ id: string }> }) {
  const relatorioId = Number((await params).id);
  if (!Number.isInteger(relatorioId)) {
    notFound();
  }

  const sessao = await exigirAcessoAoRelatorio(relatorioId, "visualizar");

  const relatorio = await prisma.relatorio.findUniqueOrThrow({
    where: { id: relatorioId },
    include: {
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

  const ehAutor = relatorio.docenteId === sessao.usuarioId;
  const editavel =
    ehAutor &&
    (relatorio.situacao === SituacaoRelatorio.RASCUNHO ||
      relatorio.situacao === SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE);
  const devolucao = relatorio.eventos.find((evento) => evento.tipo === TipoEvento.DEVOLUCAO);

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex items-center gap-2 text-[13px] text-tinta-suave">
        <Link href="/" className="text-azul-interativo">
          Seus relatórios
        </Link>
        <span aria-hidden>›</span>
        <span>
          {relatorio.curso.nome} · {relatorio.periodo.ano}/{relatorio.periodo.semestre}
        </span>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5 rounded-md border border-borda bg-superficie p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-borda pb-5">
            <div>
              <div className="font-mono text-xs font-medium tracking-[.1em] text-tinta-suave">
                {codigoRelatorio(relatorio.periodo.ano, relatorio.periodo.semestre, relatorio.id)}
              </div>
              <h1 className="mt-2 font-serif text-2xl font-semibold text-azul-interativo">
                {relatorio.curso.nome}
              </h1>
              <p className="mt-1.5 text-[15px] text-tinta-suave">
                {relatorio.periodo.semestre}º semestre de {relatorio.periodo.ano} · entrega até{" "}
                <span className="font-mono font-medium">
                  {relatorio.periodo.encerramentoSubmissao.toLocaleDateString("pt-BR")}
                </span>
              </p>
            </div>
            <SituacaoPill situacao={relatorio.situacao} />
          </div>

          {relatorio.situacao === SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE && devolucao && (
            <div className="rounded border border-[#e9c3c0] border-l-[3px] border-l-estado-devolvido bg-[#fdf0ef] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-estado-devolvido">
                O que a coordenação pediu para ajustar
              </h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-pretty">{devolucao.justificativa}</p>
              <p className="mt-3 text-[13px] text-tinta-suave">
                {devolucao.usuario.nome} ·{" "}
                <span className="font-mono font-medium">{formatarDataHora(devolucao.ocorridoEm)}</span>
              </p>
            </div>
          )}

          <FormularioRelatorio
            relatorioId={relatorio.id}
            somenteLeitura={!editavel}
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

        <TrilhaAuditoria eventos={relatorio.eventos} cargaHorariaTotal={relatorio.cargaHorariaTotal.toNumber()} />
      </div>
    </div>
  );
}
