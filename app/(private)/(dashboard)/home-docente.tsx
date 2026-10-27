import { prisma } from "../../../lib/db";
import { obterUsuario } from "../../../lib/auth/guards";
import { SituacaoRelatorio, TipoEvento } from "../../../generated/prisma/enums";
import { codigoRelatorio, formatarData, formatarDataHora, formatarHoras, saudacao } from "../../../lib/formato";
import { prazoDeEntrega } from "../../../lib/services/workflow";
import { CabecalhoAdmin } from "../../../components/CabecalhoAdmin";
import { AvisoVazio } from "../../../components/AvisoVazio";
import { BotaoPrimario } from "../../../components/BotaoPrimario";
import { Pill } from "../../../components/Pill";
import { SituacaoPill, aparenciaSituacao } from "../../../components/SituacaoPill";
import { Cartao } from "../../../components/Cartao";
import { Destaque } from "../../../components/Destaque";
import { RotuloCodigo } from "../../../components/RotuloCodigo";
import { SeloIcone } from "../../../components/SeloIcone";
import { IconeDocumento, IconeRelogio } from "../../../components/Icones";
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

  const [usuario, vinculos, relatorios, devolvidosDeOutrosPeriodos] = await Promise.all([
    obterUsuario(usuarioId),
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
      <div className="flex flex-col gap-6">
        <CabecalhoAdmin titulo={saudacao(usuario.nome)} />
        <AvisoVazio>
          Nenhum período letivo está aberto para submissão no momento. Os relatórios já entregues ficam no
          Arquivo.
        </AvisoVazio>
      </div>
    );
  }

  const porCurso = new Map(relatorios.map((relatorio) => [relatorio.cursoId, relatorio]));
  const diasRestantes = periodo
    ? Math.ceil((periodo.encerramentoSubmissao.getTime() - agora.getTime()) / 86_400_000)
    : 0;

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoAdmin
        titulo={saudacao(usuario.nome)}
        subtitulo={
          <p className="text-[15px] text-tinta-suave">
            {periodo
              ? `Estes são os seus relatórios do ${periodo.semestre}º semestre de ${periodo.ano}.`
              : "Há relatórios devolvidos esperando a sua correção."}
          </p>
        }
        acao={periodo && <PrazoEntrega encerramento={periodo.encerramentoSubmissao} diasRestantes={diasRestantes} />}
      />

      {periodo && (
        <section className="flex flex-col gap-4">
          <CabecalhoAdmin
            nivel={2}
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
            <AvisoVazio>
              Você não está vinculado a nenhum curso neste período. Procure a secretaria acadêmica.
            </AvisoVazio>
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
        </section>
      )}

      {devolvidosPendentes.length > 0 && (
        <section className="flex flex-col gap-4">
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
        </section>
      )}
    </div>
  );
}

// Fica no cabeçalho, à vista desde o primeiro segundo; ganha o âmbar (e o
// relógio âmbar) só na última semana, para o destaque significar alguma coisa.
function PrazoEntrega({ encerramento, diasRestantes }: { encerramento: Date; diasRestantes: number }) {
  const urgente = diasRestantes < 7;
  return (
    <Destaque
      tom={urgente ? "aguardando" : "neutro"}
      compacto
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      <SeloIcone tom="branco" className={urgente ? "text-estado-aguardando" : "text-azul-interativo"}>
        <IconeRelogio className="h-[22px] w-[22px]" />
      </SeloIcone>
      <div>
        <div className="text-[13px] font-semibold text-tinta-suave">Prazo de entrega</div>
        <div className="font-mono text-lg font-semibold tabular-nums">{formatarData(encerramento)}</div>
      </div>
      <Pill cor={urgente ? "aguardando" : "neutro"} forma="quadrado">
        {diasRestantes <= 1 ? "último dia" : `faltam ${diasRestantes} dias`}
      </Pill>
    </Destaque>
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
  const barra = relatorio ? aparenciaSituacao[relatorio.situacao].barra : "bg-borda";

  return (
    <Cartao como="article" faixa={barra} className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <SeloIcone tamanho="lg">
            <IconeDocumento className="h-6 w-6" />
          </SeloIcone>
          <div className="min-w-0">
            <RotuloCodigo>
              {relatorio ? codigoRelatorio(periodo.ano, periodo.semestre, relatorio.id) : "SEM RELATÓRIO INICIADO"}
            </RotuloCodigo>
            <h3 className="mt-1 text-xl font-bold tracking-tight">{cursoNome}</h3>
          </div>
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
        <Destaque como="p" tom="devolvido" compacto className="text-[13px] leading-relaxed">
          A coordenação pediu ajuste em {formatarData(devolucao.ocorridoEm)}: <q>{devolucao.justificativa}</q>{" "}
          Reenvie até{" "}
          <span className="font-mono font-medium">
            {formatarDataHora(prazoDeEntrega(relatorio.situacao, periodo.encerramentoSubmissao, devolucao.ocorridoEm))}
          </span>
          .
        </Destaque>
      ) : (
        <p className="text-[13px] leading-relaxed text-tinta-suave">
          {relatorio
            ? `Atualizado em ${formatarData(relatorio.atualizadoEm)}.`
            : "Você ainda não começou este relatório."}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-borda pt-5">
        <div>
          <div className="text-[13px] font-semibold text-tinta-suave">Horas declaradas</div>
          <div className="mt-1 font-mono text-3xl font-semibold tabular-nums">
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
    </Cartao>
  );
}
