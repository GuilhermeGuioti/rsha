import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAcessoAoRelatorio } from "../../../../../lib/auth/guards";
import { prisma } from "../../../../../lib/db";
import { SituacaoRelatorio, TipoEvento } from "../../../../../generated/prisma/enums";
import { codigoRelatorio, formatarDataHora } from "../../../../../lib/formato";
import { prazoDeEntrega } from "../../../../../lib/services/workflow";
import { SituacaoPill } from "../../../../../components/SituacaoPill";
import { classeCartao } from "../../../../../components/Cartao";
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
  const devolucao = relatorio.eventos.find((evento) => evento.tipo === TipoEvento.DEVOLUCAO);
  // Mesmo prazo que o serviço aplica ao salvar e enviar: fora dele o
  // formulário vira leitura, em vez de aceitar edição que o servidor recusaria.
  const prazo = prazoDeEntrega(
    relatorio.situacao,
    relatorio.periodo.encerramentoSubmissao,
    devolucao?.ocorridoEm ?? null,
  );
  const agora = new Date();
  const dentroDoPrazo = agora >= relatorio.periodo.aberturaSubmissao && agora <= prazo;
  const aguardaDocente =
    relatorio.situacao === SituacaoRelatorio.RASCUNHO ||
    relatorio.situacao === SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE;
  const editavel = ehAutor && aguardaDocente && dentroDoPrazo;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Você está em" className="flex flex-wrap items-center gap-2 text-[13px] text-tinta-suave">
        <Link href="/" className="font-semibold text-azul-interativo hover:underline">
          Seus relatórios
        </Link>
        <span aria-hidden>›</span>
        <span>
          {relatorio.curso.nome} · {relatorio.periodo.ano}/{relatorio.periodo.semestre}
        </span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className={`flex flex-col gap-6 p-5 sm:p-7 ${classeCartao}`}>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-borda pb-6">
            <div>
              <div className="font-mono text-xs font-medium tracking-[.1em] text-tinta-suave">
                {codigoRelatorio(relatorio.periodo.ano, relatorio.periodo.semestre, relatorio.id)}
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-[28px]">{relatorio.curso.nome}</h1>
              <p className="mt-1.5 text-[15px] text-tinta-suave">
                {relatorio.periodo.semestre}º semestre de {relatorio.periodo.ano} · entrega até{" "}
                <span className="font-mono font-medium">{formatarDataHora(prazo)}</span>
              </p>
            </div>
            <SituacaoPill situacao={relatorio.situacao} />
          </div>

          {relatorio.situacao === SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE && devolucao && (
            <div className="rounded-2xl border border-estado-devolvido-borda bg-estado-devolvido-suave px-5 py-4">
              <h2 className="flex items-center gap-2 text-[15px] font-bold text-estado-devolvido">
                <span aria-hidden className="h-2.5 w-3 flex-none bg-current [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
                O que a coordenação pediu para ajustar
              </h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-pretty">{devolucao.justificativa}</p>
              <p className="mt-3 text-[13px] text-tinta-suave">
                {devolucao.usuario.nome} ·{" "}
                <span className="font-mono font-medium">{formatarDataHora(devolucao.ocorridoEm)}</span>
              </p>
            </div>
          )}

          {ehAutor && aguardaDocente && !dentroDoPrazo && (
            <p className="rounded-2xl border border-borda bg-superficie-sutil px-5 py-4 text-[15px] text-tinta-suave">
              {agora < relatorio.periodo.aberturaSubmissao
                ? `A entrega deste relatório abre em ${formatarDataHora(relatorio.periodo.aberturaSubmissao)}.`
                : `O prazo de entrega encerrou em ${formatarDataHora(prazo)}. O relatório continua disponível para consulta.`}
            </p>
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
