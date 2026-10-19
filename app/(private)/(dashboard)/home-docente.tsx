import { prisma } from "../../../lib/db";
import { SituacaoRelatorio, TipoEvento } from "../../../generated/prisma/enums";
import { codigoRelatorio, formatarData, formatarDataHora, formatarHoras } from "../../../lib/formato";
import { prazoDeEntrega } from "../../../lib/services/workflow";
import { CabecalhoAdmin } from "../../../components/CabecalhoAdmin";
import { BotaoPrimario } from "../../../components/BotaoPrimario";
import { Pill } from "../../../components/Pill";
import { SituacaoPill, aparenciaSituacao } from "../../../components/SituacaoPill";
import { acaoAbrirRelatorio } from "./relatorios/acoes";

// Só a última devolução importa: é ela que o card mostra e que define o
// prazo estendido do devolvido.
const ULTIMA_DEVOLUCAO = {
  where: { tipo: TipoEvento.DEVOLUCAO },
  orderBy: { ocorridoEm: "desc" as const },
  take: 1,
};

export async function HomeDocente({ usuarioId }: { usuarioId: number }) {
  const agora = new Date();
  const periodo = await prisma.periodoLetivo.findFirst({
    where: { aberturaSubmissao: { lte: agora }, encerramentoSubmissao: { gte: agora } },
    orderBy: [{ ano: "desc" }, { semestre: "desc" }],
  });

  const [vinculos, relatorios, devolvidosDeOutrosPeriodos] = await Promise.all([
    periodo
      ? prisma.vinculoDocenteCurso.findMany({
          where: { docenteId: usuarioId, periodoLetivoId: periodo.id },
          include: { curso: true },
          orderBy: { curso: { nome: "asc" } },
        })
      : [],
    periodo
      ? prisma.relatorio.findMany({
          where: { docenteId: usuarioId, periodoLetivoId: periodo.id },
          include: { eventos: ULTIMA_DEVOLUCAO },
        })
      : [],
    // Devolução depois do encerramento ganha prazo extra para correção (ver
    // prazoDeEntrega) — sem esta lista o docente não acharia o relatório, já
    // que o período dele não está mais aberto.
    prisma.relatorio.findMany({
      where: {
        docenteId: usuarioId,
        situacao: SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE,
        ...(periodo ? { periodoLetivoId: { not: periodo.id } } : {}),
      },
      include: { curso: true, periodo: true, eventos: ULTIMA_DEVOLUCAO },
      orderBy: [{ periodo: { ano: "desc" } }, { periodo: { semestre: "desc" } }, { curso: { nome: "asc" } }],
    }),
  ]);

  const devolvidosPendentes = devolvidosDeOutrosPeriodos.filter(
    (relatorio) =>
      prazoDeEntrega(
        relatorio.situacao,
        relatorio.periodo.encerramentoSubmissao,
        relatorio.eventos[0]?.ocorridoEm ?? null,
      ) >= agora,
  );

  if (!periodo && devolvidosPendentes.length === 0) {
    return (
      <p className="text-[15px] text-tinta-suave">
        Nenhum período letivo está aberto para submissão no momento.
      </p>
    );
  }

  const porCurso = new Map(relatorios.map((relatorio) => [relatorio.cursoId, relatorio]));
  const diasRestantes = periodo
    ? Math.ceil((periodo.encerramentoSubmissao.getTime() - agora.getTime()) / 86_400_000)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {periodo && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-[#e9cfa0] border-l-[3px] border-l-estado-aguardando bg-[#fff6e8] px-4 py-3.5">
            <p className="text-[15px]">
              Prazo de entrega do{" "}
              <strong className="font-semibold">
                {periodo.semestre}º semestre de {periodo.ano}
              </strong>
              :{" "}
              <span className="font-mono font-semibold tabular-nums">
                {formatarData(periodo.encerramentoSubmissao)}
              </span>
            </p>
            <Pill cor="aguardando" forma="quadrado">
              {diasRestantes <= 1 ? "último dia" : `faltam ${diasRestantes} dias`}
            </Pill>
          </div>

          <CabecalhoAdmin
            titulo="Seus relatórios"
            subtitulo={
              <p className="text-[15px] text-tinta-suave">
                {vinculos.length === 1
                  ? "Você atua em um curso neste período."
                  : `Você atua em ${vinculos.length} cursos neste período. Cada curso tem seu próprio relatório, enviado separadamente.`}
              </p>
            }
          />

          {vinculos.length === 0 ? (
            <p className="text-[15px] text-tinta-suave">
              Você não está vinculado a nenhum curso neste período. Procure a secretaria acadêmica.
            </p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {vinculos.map((vinculo) => (
                <CartaoRelatorio
                  key={vinculo.id}
                  cursoId={vinculo.cursoId}
                  cursoNome={vinculo.curso.nome}
                  periodo={periodo}
                  relatorio={porCurso.get(vinculo.cursoId) ?? null}
                />
              ))}
            </div>
          )}
        </>
      )}

      {devolvidosPendentes.length > 0 && (
        <>
          <CabecalhoAdmin
            nivel={2}
            titulo="Devolvidos de períodos encerrados"
            subtitulo={
              <p className="text-[15px] text-tinta-suave">
                A coordenação pediu ajuste depois do prazo do semestre. Corrija e reenvie até a data indicada em
                cada relatório.
              </p>
            }
          />
          <div className="grid gap-5 lg:grid-cols-2">
            {devolvidosPendentes.map((relatorio) => (
              <CartaoRelatorio
                key={relatorio.id}
                cursoId={relatorio.cursoId}
                cursoNome={relatorio.curso.nome}
                periodo={relatorio.periodo}
                relatorio={relatorio}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CartaoRelatorio({
  cursoId,
  cursoNome,
  periodo,
  relatorio,
}: {
  cursoId: number;
  cursoNome: string;
  periodo: { id: number; ano: number; semestre: number; encerramentoSubmissao: Date };
  relatorio: {
    id: number;
    situacao: SituacaoRelatorio;
    cargaHorariaTotal: { toNumber(): number };
    atualizadoEm: Date;
    eventos: { ocorridoEm: Date; justificativa: string | null }[];
  } | null;
}) {
  const devolucao = relatorio?.eventos[0];
  const borda = relatorio ? aparenciaSituacao[relatorio.situacao].borda : "border-t-estado-rascunho";

  return (
    <article
      className={`flex flex-col gap-4 rounded-md border border-borda border-t-[3px] bg-superficie p-5 ${borda}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs font-medium tracking-[.1em] text-tinta-suave">
            {relatorio ? codigoRelatorio(periodo.ano, periodo.semestre, relatorio.id) : "SEM RELATÓRIO INICIADO"}
          </div>
          <h2 className="mt-2 font-serif text-lg font-semibold">{cursoNome}</h2>
        </div>
        {relatorio ? (
          <SituacaoPill situacao={relatorio.situacao} />
        ) : (
          <Pill cor="neutro" forma="circulo-vazado">
            Não iniciado
          </Pill>
        )}
      </div>

      {devolucao && relatorio?.situacao === SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE ? (
        <p className="rounded-sm border-l-[3px] border-estado-devolvido bg-[#fdf0ef] px-3.5 py-3 text-[13px] leading-relaxed">
          A coordenação pediu ajuste em {formatarData(devolucao.ocorridoEm)}: <q>{devolucao.justificativa}</q>{" "}
          Reenvie até{" "}
          <span className="font-mono font-medium">
            {formatarDataHora(prazoDeEntrega(relatorio.situacao, periodo.encerramentoSubmissao, devolucao.ocorridoEm))}
          </span>
          .
        </p>
      ) : (
        <p className="text-[13px] leading-relaxed text-tinta-suave">
          {relatorio
            ? `Atualizado em ${formatarData(relatorio.atualizadoEm)}.`
            : "Você ainda não começou este relatório."}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-borda pt-4">
        <div>
          <div className="text-[13px] text-tinta-suave">Horas declaradas</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
            {formatarHoras(relatorio ? relatorio.cargaHorariaTotal.toNumber() : 0)}
          </div>
        </div>
        <form action={acaoAbrirRelatorio}>
          <input type="hidden" name="cursoId" value={cursoId} />
          <input type="hidden" name="periodoLetivoId" value={periodo.id} />
          <BotaoPrimario type="submit">
            {!relatorio
              ? "Começar relatório"
              : relatorio.situacao === SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE
                ? "Corrigir e reenviar"
                : relatorio.situacao === SituacaoRelatorio.RASCUNHO
                  ? "Continuar preenchendo"
                  : "Ver relatório"}
          </BotaoPrimario>
        </form>
      </div>
    </article>
  );
}
