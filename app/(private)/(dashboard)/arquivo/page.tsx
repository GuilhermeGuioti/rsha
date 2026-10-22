import { exigirSessaoPagina, obterPerfis } from "../../../../lib/auth/guards";
import { prisma } from "../../../../lib/db";
import { Perfil, SituacaoRelatorio, TipoEvento } from "../../../../generated/prisma/enums";
import { estaComODocente, resolverAvaliadorId } from "../../../../lib/services/workflow";
import { ExploradorArquivo, type LinhaArquivo } from "./explorador-arquivo";

export default async function ArquivoPage() {
  const sessao = await exigirSessaoPagina();
  const perfis = await obterPerfis(sessao.usuarioId);

  // Secretaria enxerga todos os cursos, todos os docentes. Coordenador
  // enxerga o curso inteiro — é o papel de fiscalização (mesma abrangência
  // de /acompanhamento e /avaliacao). Docente sem esse chapéu só enxerga o
  // próprio vínculo: o arquivo não é lugar de ver a submissão do colega.
  // "todos" na tabela de rotas quer dizer "todo usuário autenticado", não
  // "todo curso" nem "toda pessoa dentro do curso".
  let cursoIds: number[] | null = null;
  let cursoIdsCoordenador: Set<number> | null = null;
  if (!perfis.includes(Perfil.SECRETARIA)) {
    const [comoDocente, comoCoordenador] = await Promise.all([
      prisma.vinculoDocenteCurso.findMany({
        where: { docenteId: sessao.usuarioId },
        select: { cursoId: true },
      }),
      prisma.vinculoCoordenadorCurso.findMany({
        where: { coordenadorId: sessao.usuarioId },
        select: { cursoId: true },
      }),
    ]);
    cursoIds = [...new Set([...comoDocente, ...comoCoordenador].map((v) => v.cursoId))];
    cursoIdsCoordenador = new Set(comoCoordenador.map((v) => v.cursoId));

    if (cursoIds.length === 0) {
      return (
        <p className="text-[15px] text-tinta-suave">
          Você ainda não está vinculado a nenhum curso. Procure a secretaria acadêmica.
        </p>
      );
    }
  }

  const filtroCurso = cursoIds ? { cursoId: { in: cursoIds } } : {};

  // O arquivo não é uma tabela própria: é a mesma consulta com filtro que
  // sustenta o painel de acompanhamento (ver CLAUDE.md § armadilha do RF18).
  // O vínculo docente-curso-período é quem define a "turma esperada"; o
  // relatório, quando existe, preenche a linha — quando não existe, a linha
  // aparece como "não entregue".
  const [vinculos, relatorios, tipos] = await Promise.all([
    prisma.vinculoDocenteCurso.findMany({
      where: filtroCurso,
      include: { curso: true, periodo: true, docente: true },
    }),
    prisma.relatorio.findMany({
      where: filtroCurso,
      include: {
        eventos: { orderBy: { ocorridoEm: "desc" } },
        itens: { select: { tipoAtividadeId: true } },
      },
    }),
    // Tipo inativado continua no filtro enquanto houver item dele — é o
    // arquivo de períodos passados, quando o tipo ainda valia.
    prisma.tipoAtividade.findMany({
      where: { OR: [{ ativo: true }, { itens: { some: {} } }] },
      select: { id: true, descricao: true },
      orderBy: { descricao: "asc" },
    }),
  ]);

  // Dentro dos cursos em escopo, restringe linha a linha: coordenador vê a
  // turma inteira daquele curso, docente só a própria — mesmo curso pode
  // aparecer "inteiro" pra quem coordena e "só eu" pra quem só dá aula nele.
  const vinculosVisiveis = cursoIdsCoordenador
    ? vinculos.filter(
        (vinculo) => cursoIdsCoordenador!.has(vinculo.cursoId) || vinculo.docenteId === sessao.usuarioId,
      )
    : vinculos;

  if (vinculosVisiveis.length === 0) {
    return <p className="text-[15px] text-tinta-suave">Nenhuma turma cadastrada ainda.</p>;
  }

  const relatorioPorChave = new Map(
    relatorios.map((relatorio) => [
      `${relatorio.docenteId}:${relatorio.cursoId}:${relatorio.periodoLetivoId}`,
      relatorio,
    ]),
  );

  // O avaliador (coordenador do curso) decide pra onde "Abrir" leva: quem
  // avalia o curso usa a mesma tela de avaliação; os demais, a tela de
  // leitura do relatório — a mesma distinção que /avaliacao e /relatorios já
  // fazem (exigirAcessoAoRelatorio cobre os dois casos).
  const cursosDistintos = [...new Set(vinculosVisiveis.map((vinculo) => vinculo.cursoId))];
  const avaliadorPorCurso = new Map(
    await Promise.all(
      cursosDistintos.map(async (id) => [id, await resolverAvaliadorId(prisma, id)] as const),
    ),
  );

  const linhas: LinhaArquivo[] = vinculosVisiveis.map((vinculo) => {
    const relatorio = relatorioPorChave.get(
      `${vinculo.docenteId}:${vinculo.cursoId}:${vinculo.periodoLetivoId}`,
    );
    const aprovacao = relatorio?.eventos.find((evento) => evento.tipo === TipoEvento.APROVACAO);
    // Rascunho alheio não é visível à coordenação (RF07): a linha mostra a
    // situação, mas sem horas nem link para o conteúdo.
    const conteudoVisivel =
      relatorio !== undefined &&
      (relatorio.situacao !== SituacaoRelatorio.RASCUNHO || !cursoIdsCoordenador || vinculo.docenteId === sessao.usuarioId);

    return {
      vinculoId: vinculo.id,
      ano: vinculo.periodo.ano,
      semestre: vinculo.periodo.semestre,
      periodoLetivoId: vinculo.periodoLetivoId,
      aberturaSubmissao: vinculo.periodo.aberturaSubmissao,
      encerramentoSubmissao: vinculo.periodo.encerramentoSubmissao,
      cursoId: vinculo.cursoId,
      cursoNome: vinculo.curso.nome,
      docenteId: vinculo.docenteId,
      docenteNome: vinculo.docente.nome,
      relatorioId: conteudoVisivel ? relatorio.id : null,
      situacao: relatorio?.situacao ?? null,
      horas: conteudoVisivel ? relatorio.cargaHorariaTotal.toNumber() : null,
      // Pelo mesmo motivo, rascunho alheio não entra no filtro por tipo —
      // casar com ele revelaria o que o docente está declarando.
      tipoAtividadeIds: conteudoVisivel ? [...new Set(relatorio.itens.map((item) => item.tipoAtividadeId))] : [],
      aprovadoEm: aprovacao?.ocorridoEm ?? null,
      // O próprio relatório que ainda está com o docente (rascunho, devolvido)
      // abre no formulário mesmo para quem avalia o curso — na tela de
      // avaliação ele seria só leitura, sem como continuar preenchendo.
      podeAvaliar:
        avaliadorPorCurso.get(vinculo.cursoId) === sessao.usuarioId &&
        !(vinculo.docenteId === sessao.usuarioId && estaComODocente(relatorio?.situacao)),
    };
  });

  return <ExploradorArquivo linhas={linhas} tipos={tipos} />;
}
