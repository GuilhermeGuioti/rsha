import { exigirSessaoPagina, obterPerfis } from "../../../../lib/auth/guards";
import { prisma } from "../../../../lib/db";
import { Perfil, TipoEvento } from "../../../../generated/prisma/enums";
import { resolverAvaliadorId } from "../../../../lib/services/workflow";
import { ExploradorArquivo, type LinhaArquivo } from "./explorador-arquivo";

export default async function ArquivoPage() {
  const sessao = await exigirSessaoPagina();
  const perfis = await obterPerfis(sessao.usuarioId);

  // Secretaria enxerga todos os cursos. Os demais perfis só enxergam os
  // cursos onde atuam — como docente, como coordenador, ou os dois (união,
  // pra quem acumula os dois perfis no mesmo curso). "todos" na tabela de
  // rotas quer dizer "todo usuário autenticado", não "todo curso".
  let cursoIds: number[] | null = null;
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
  const [vinculos, relatorios] = await Promise.all([
    prisma.vinculoDocenteCurso.findMany({
      where: filtroCurso,
      include: { curso: true, periodo: true, docente: true },
    }),
    prisma.relatorio.findMany({
      where: filtroCurso,
      include: { eventos: { orderBy: { ocorridoEm: "desc" } } },
    }),
  ]);

  if (vinculos.length === 0) {
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
  const cursosDistintos = [...new Set(vinculos.map((vinculo) => vinculo.cursoId))];
  const avaliadorPorCurso = new Map(
    await Promise.all(
      cursosDistintos.map(async (id) => [id, await resolverAvaliadorId(prisma, id)] as const),
    ),
  );

  const linhas: LinhaArquivo[] = vinculos.map((vinculo) => {
    const relatorio = relatorioPorChave.get(
      `${vinculo.docenteId}:${vinculo.cursoId}:${vinculo.periodoLetivoId}`,
    );
    const aprovacao = relatorio?.eventos.find((evento) => evento.tipo === TipoEvento.APROVACAO);

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
      relatorioId: relatorio?.id ?? null,
      situacao: relatorio?.situacao ?? null,
      horas: relatorio ? relatorio.cargaHorariaTotal.toNumber() : null,
      aprovadoEm: aprovacao?.ocorridoEm ?? null,
      podeAvaliar: avaliadorPorCurso.get(vinculo.cursoId) === sessao.usuarioId,
    };
  });

  return <ExploradorArquivo linhas={linhas} />;
}
