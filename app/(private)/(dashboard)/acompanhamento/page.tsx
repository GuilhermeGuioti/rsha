import { exigirSessaoPagina, obterPerfis } from "../../../../lib/auth/guards";
import { prisma } from "../../../../lib/db";
import { Perfil, SituacaoRelatorio } from "../../../../generated/prisma/enums";
import { resolverAvaliadorId } from "../../../../lib/services/workflow";
import {
  PainelAcompanhamento,
  type DocenteAcompanhamento,
  type GrupoPeriodo,
  type LinhaAcompanhamento,
} from "./painel-acompanhamento";

export default async function AcompanhamentoPage() {
  const sessao = await exigirSessaoPagina();
  const perfis = await obterPerfis(sessao.usuarioId);
  if (!perfis.includes(Perfil.COORDENADOR) && !perfis.includes(Perfil.SECRETARIA)) {
    throw new Error("Acesso restrito à coordenação e à secretaria acadêmica.");
  }

  // Traz todos os períodos, não só o mais recente — a coordenação continua
  // consultando o fechamento de semestres anteriores (mesmo raciocínio de
  // /avaliacao). O filtro por período fica por conta do cliente.
  const periodos = await prisma.periodoLetivo.findMany({
    orderBy: [{ ano: "desc" }, { semestre: "desc" }],
  });

  if (periodos.length === 0) {
    return <p className="text-[15px] text-tinta-suave">Nenhum período letivo cadastrado ainda.</p>;
  }

  // Secretaria acompanha todos os cursos; coordenador só os que coordena —
  // mesmo recorte de "quem enxerga o quê" já usado no /arquivo. O vínculo de
  // coordenador não é por período, então esse recorte vale pra todos eles.
  const ehSecretaria = perfis.includes(Perfil.SECRETARIA);
  let cursoIds: number[] | null = null;
  if (!ehSecretaria) {
    const vinculosCoordenador = await prisma.vinculoCoordenadorCurso.findMany({
      where: { coordenadorId: sessao.usuarioId },
      select: { cursoId: true },
    });
    cursoIds = vinculosCoordenador.map((vinculo) => vinculo.cursoId);
    if (cursoIds.length === 0) {
      return (
        <p className="text-[15px] text-tinta-suave">
          Você ainda não coordena nenhum curso. Procure a secretaria acadêmica.
        </p>
      );
    }
  }

  const filtroCurso = cursoIds ? { cursoId: { in: cursoIds } } : {};

  // Mesma dupla consulta vínculo + relatório do /arquivo (ver CLAUDE.md §
  // armadilha do painel de acompanhamento): "não iniciado" só existe porque
  // o vínculo não tem relatório correspondente, nunca porque uma linha diz
  // isso — contar só a tabela Relatorio esconderia quem nem abriu o sistema.
  const [vinculos, relatorios] = await Promise.all([
    prisma.vinculoDocenteCurso.findMany({
      where: { ...filtroCurso },
      include: { curso: true, docente: true },
    }),
    prisma.relatorio.findMany({
      where: { ...filtroCurso },
      select: {
        id: true,
        docenteId: true,
        cursoId: true,
        periodoLetivoId: true,
        situacao: true,
        cargaHorariaTotal: true,
        atualizadoEm: true,
      },
    }),
  ]);

  if (vinculos.length === 0) {
    return <p className="text-[15px] text-tinta-suave">Nenhum vínculo docente-curso cadastrado ainda.</p>;
  }

  // O modal, ao abrir um relatório, leva ao mesmo destino que /arquivo já
  // decide: quem avalia o curso cai na tela de avaliação, os demais na
  // leitura (exigirAcessoAoRelatorio cobre os dois casos). O avaliador é o
  // coordenador do curso, sem depender do período.
  const cursosDistintos = [...new Set(vinculos.map((vinculo) => vinculo.cursoId))];
  const avaliadorPorCurso = new Map(
    await Promise.all(
      cursosDistintos.map(async (id) => [id, await resolverAvaliadorId(prisma, id)] as const),
    ),
  );

  const relatorioPorChave = new Map(
    relatorios.map((relatorio) => [
      `${relatorio.docenteId}:${relatorio.cursoId}:${relatorio.periodoLetivoId}`,
      relatorio,
    ]),
  );

  const cursosPorPeriodo = new Map<number, Map<number, LinhaAcompanhamento>>();
  for (const vinculo of vinculos) {
    let cursos = cursosPorPeriodo.get(vinculo.periodoLetivoId);
    if (!cursos) {
      cursos = new Map();
      cursosPorPeriodo.set(vinculo.periodoLetivoId, cursos);
    }

    let linha = cursos.get(vinculo.cursoId);
    if (!linha) {
      linha = {
        cursoId: vinculo.cursoId,
        cursoNome: vinculo.curso.nome,
        naoIniciados: [],
        rascunho: [],
        aguardando: [],
        devolvido: [],
        aprovado: [],
      };
      cursos.set(vinculo.cursoId, linha);
    }

    const relatorio = relatorioPorChave.get(
      `${vinculo.docenteId}:${vinculo.cursoId}:${vinculo.periodoLetivoId}`,
    );
    // Rascunho alheio não é visível à coordenação (RF07): o painel conta que
    // ele existe, mas sem horas nem link para o conteúdo.
    const conteudoVisivel =
      relatorio !== undefined &&
      (relatorio.situacao !== SituacaoRelatorio.RASCUNHO || ehSecretaria || vinculo.docenteId === sessao.usuarioId);
    const docente: DocenteAcompanhamento = {
      docenteId: vinculo.docenteId,
      docenteNome: vinculo.docente.nome,
      relatorioId: conteudoVisivel ? relatorio.id : null,
      horas: conteudoVisivel ? relatorio.cargaHorariaTotal.toNumber() : null,
      atualizadoEm: relatorio?.atualizadoEm ?? null,
      podeAvaliar: avaliadorPorCurso.get(vinculo.cursoId) === sessao.usuarioId,
    };

    switch (relatorio?.situacao) {
      case undefined:
        linha.naoIniciados.push(docente);
        break;
      case SituacaoRelatorio.RASCUNHO:
        linha.rascunho.push(docente);
        break;
      case SituacaoRelatorio.AGUARDANDO_AVALIACAO:
        linha.aguardando.push(docente);
        break;
      case SituacaoRelatorio.DEVOLVIDO_PARA_AJUSTE:
        linha.devolvido.push(docente);
        break;
      case SituacaoRelatorio.APROVADO:
        linha.aprovado.push(docente);
        break;
    }
  }

  function ordenarPorNome(docentes: DocenteAcompanhamento[]): DocenteAcompanhamento[] {
    return [...docentes].sort((a, b) => a.docenteNome.localeCompare(b.docenteNome, "pt-BR"));
  }

  const grupos: GrupoPeriodo[] = periodos.map((periodo) => {
    const cursos = cursosPorPeriodo.get(periodo.id) ?? new Map<number, LinhaAcompanhamento>();
    const linhas = [...cursos.values()]
      .map((linha) => ({
        ...linha,
        naoIniciados: ordenarPorNome(linha.naoIniciados),
        rascunho: ordenarPorNome(linha.rascunho),
        aguardando: ordenarPorNome(linha.aguardando),
        devolvido: ordenarPorNome(linha.devolvido),
        aprovado: ordenarPorNome(linha.aprovado),
      }))
      .sort((a, b) => a.cursoNome.localeCompare(b.cursoNome, "pt-BR"));

    return {
      periodoLetivoId: periodo.id,
      rotulo: `${periodo.semestre}º semestre de ${periodo.ano}`,
      prazo: periodo.encerramentoSubmissao,
      linhas,
    };
  });

  return <PainelAcompanhamento grupos={grupos} podeExtrair={ehSecretaria} />;
}
