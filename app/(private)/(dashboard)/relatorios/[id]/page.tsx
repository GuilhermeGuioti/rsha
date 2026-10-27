import { notFound } from "next/navigation";
import { exigirAcessoAoRelatorio } from "../../../../../lib/auth/guards";
import { prisma } from "../../../../../lib/db";
import { SituacaoRelatorio, TipoEvento } from "../../../../../generated/prisma/enums";
import { codigoRelatorio, formatarDataHora } from "../../../../../lib/formato";
import { prazoDeEntrega } from "../../../../../lib/services/workflow";
import { SituacaoPill } from "../../../../../components/SituacaoPill";
import { Destaque } from "../../../../../components/Destaque";
import { TelaRelatorio } from "../../../../../components/TelaRelatorio";
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
    <TelaRelatorio
      caminho={[
        { rotulo: "Seus relatórios", href: "/" },
        { rotulo: `${relatorio.curso.nome} · ${relatorio.periodo.ano}/${relatorio.periodo.semestre}` },
      ]}
      codigo={codigoRelatorio(relatorio.periodo.ano, relatorio.periodo.semestre, relatorio.id)}
      titulo={relatorio.curso.nome}
      subtitulo={
        <>
          {relatorio.periodo.semestre}º semestre de {relatorio.periodo.ano} · entrega até{" "}
          <span className="font-mono font-medium">{formatarDataHora(prazo)}</span>
        </>
      }
      situacao={<SituacaoPill situacao={relatorio.situacao} />}
      eventos={relatorio.eventos}
      cargaHorariaTotal={relatorio.cargaHorariaTotal.toNumber()}
    >
      {relatorio.situacao === SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE && devolucao && (
        <Destaque tom="devolvido" titulo="O que a coordenação pediu para ajustar">
          <p className="mt-2.5 text-[15px] leading-relaxed text-pretty">{devolucao.justificativa}</p>
          <p className="mt-3 text-[13px] text-tinta-suave">
            {devolucao.usuario.nome} ·{" "}
            <span className="font-mono font-medium">{formatarDataHora(devolucao.ocorridoEm)}</span>
          </p>
        </Destaque>
      )}

      {ehAutor && aguardaDocente && !dentroDoPrazo && (
        <Destaque como="p" tom="neutro" className="text-[15px] text-tinta-suave">
          {agora < relatorio.periodo.aberturaSubmissao
            ? `A entrega deste relatório abre em ${formatarDataHora(relatorio.periodo.aberturaSubmissao)}.`
            : `O prazo de entrega encerrou em ${formatarDataHora(prazo)}. O relatório continua disponível para consulta.`}
        </Destaque>
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
    </TelaRelatorio>
  );
}
