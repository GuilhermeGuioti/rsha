import { prisma } from "../../../lib/db";
import { TipoEvento } from "../../../generated/prisma/enums";
import { codigoRelatorio, formatarHoras } from "../../../lib/formato";
import { CabecalhoAdmin } from "../../../components/CabecalhoAdmin";
import { BotaoPrimario } from "../../../components/BotaoPrimario";
import { Pill } from "../../../components/Pill";
import { SituacaoPill, aparenciaSituacao } from "../../../components/SituacaoPill";
import { acaoAbrirRelatorio } from "./relatorios/acoes";

export async function HomeDocente({ usuarioId }: { usuarioId: number }) {
  const agora = new Date();
  const periodo = await prisma.periodoLetivo.findFirst({
    where: { aberturaSubmissao: { lte: agora }, encerramentoSubmissao: { gte: agora } },
    orderBy: [{ ano: "desc" }, { semestre: "desc" }],
  });

  if (!periodo) {
    return (
      <p className="text-[15px] text-tinta-suave">
        Nenhum período letivo está aberto para submissão no momento.
      </p>
    );
  }

  const [vinculos, relatorios] = await Promise.all([
    prisma.vinculoDocenteCurso.findMany({
      where: { docenteId: usuarioId, periodoLetivoId: periodo.id },
      include: { curso: true },
      orderBy: { curso: { nome: "asc" } },
    }),
    prisma.relatorio.findMany({
      where: { docenteId: usuarioId, periodoLetivoId: periodo.id },
      include: {
        eventos: {
          where: { tipo: TipoEvento.DEVOLUCAO },
          orderBy: { ocorridoEm: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const porCurso = new Map(relatorios.map((relatorio) => [relatorio.cursoId, relatorio]));
  const diasRestantes = Math.ceil((periodo.encerramentoSubmissao.getTime() - agora.getTime()) / 86_400_000);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-[#e9cfa0] border-l-[3px] border-l-estado-aguardando bg-[#fff6e8] px-4 py-3.5">
        <p className="text-[15px]">
          Prazo de entrega do{" "}
          <strong className="font-semibold">
            {periodo.semestre}º semestre de {periodo.ano}
          </strong>
          :{" "}
          <span className="font-mono font-semibold tabular-nums">
            {periodo.encerramentoSubmissao.toLocaleDateString("pt-BR")}
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
          {vinculos.map((vinculo) => {
            const relatorio = porCurso.get(vinculo.cursoId);
            const devolucao = relatorio?.eventos[0];
            const borda = relatorio ? aparenciaSituacao[relatorio.situacao].borda : "border-t-estado-rascunho";

            return (
              <article
                key={vinculo.id}
                className={`flex flex-col gap-4 rounded-md border border-borda border-t-[3px] bg-superficie p-5 ${borda}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-xs font-medium tracking-[.1em] text-tinta-suave">
                      {relatorio
                        ? codigoRelatorio(periodo.ano, periodo.semestre, relatorio.id)
                        : "SEM RELATÓRIO INICIADO"}
                    </div>
                    <h2 className="mt-2 font-serif text-lg font-semibold">{vinculo.curso.nome}</h2>
                  </div>
                  {relatorio ? (
                    <SituacaoPill situacao={relatorio.situacao} />
                  ) : (
                    <Pill cor="neutro" forma="circulo-vazado">
                      Não iniciado
                    </Pill>
                  )}
                </div>

                {devolucao && relatorio?.situacao === "DEVOLVIDO_PARA_AJUSTE" ? (
                  <p className="rounded-sm border-l-[3px] border-estado-devolvido bg-[#fdf0ef] px-3.5 py-3 text-[13px] leading-relaxed">
                    A coordenação pediu ajuste em {devolucao.ocorridoEm.toLocaleDateString("pt-BR")}:{" "}
                    <q>{devolucao.justificativa}</q>
                  </p>
                ) : (
                  <p className="text-[13px] leading-relaxed text-tinta-suave">
                    {relatorio
                      ? `Atualizado em ${relatorio.atualizadoEm.toLocaleDateString("pt-BR")}.`
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
                    <input type="hidden" name="cursoId" value={vinculo.cursoId} />
                    <input type="hidden" name="periodoLetivoId" value={periodo.id} />
                    <BotaoPrimario type="submit">
                      {!relatorio
                        ? "Começar relatório"
                        : relatorio.situacao === "DEVOLVIDO_PARA_AJUSTE"
                          ? "Corrigir e reenviar"
                          : relatorio.situacao === "RASCUNHO"
                            ? "Continuar preenchendo"
                            : "Ver relatório"}
                    </BotaoPrimario>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
