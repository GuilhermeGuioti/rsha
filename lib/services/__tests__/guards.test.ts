import { prisma } from "../../db";
import { exigirAcessoAoRelatorio, exigirSessao } from "../../auth/guards";
import { submeter } from "../workflow";
import { DiaSemana, Perfil } from "../../../generated/prisma/client";

// O guard lê a sessão do Auth.js; aqui ela é só o usuarioId da vez — o resto
// (perfis, vínculos, ativo) vem do banco, como em produção.
let usuarioLogado: number | null = null;
jest.mock("../../auth/config", () => ({
  auth: async () => (usuarioLogado === null ? null : { usuarioId: usuarioLogado }),
}));

async function limpar() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "EventoAuditoria", "ItemAtividade", "Relatorio", "VinculoCoordenadorCurso", "VinculoDocenteCurso", "TipoAtividade", "PeriodoLetivo", "Curso", "UsuarioPerfil", "Usuario" RESTART IDENTITY CASCADE`,
  );
}

async function obterAmbiente() {
  const criar = (nome: string, email: string) => prisma.usuario.create({ data: { nome, email } });
  const [docente, avaliador, coordenadorAdjunto, coordenadorOutroCurso, secretaria] = await Promise.all([
    criar("Docente", "docente@srha.dev"),
    criar("Avaliador", "avaliador@srha.dev"),
    criar("Coordenador Adjunto", "adjunto@srha.dev"),
    criar("Coordenador Outro Curso", "outro@srha.dev"),
    criar("Secretaria", "secretaria@srha.dev"),
  ]);
  await prisma.usuarioPerfil.create({ data: { usuarioId: secretaria.id, perfil: Perfil.SECRETARIA } });

  const [curso, outroCurso] = await Promise.all([
    prisma.curso.create({ data: { nome: "Fisioterapia" } }),
    prisma.curso.create({ data: { nome: "Nutrição" } }),
  ]);
  const agora = Date.now();
  const periodo = await prisma.periodoLetivo.create({
    data: {
      ano: 2026,
      semestre: 2,
      aberturaSubmissao: new Date(agora - 30 * 86_400_000),
      encerramentoSubmissao: new Date(agora + 30 * 86_400_000),
    },
  });

  // O primeiro coordenador vinculado é o avaliador; o adjunto coordena o
  // mesmo curso sem avaliar.
  await prisma.vinculoCoordenadorCurso.create({ data: { coordenadorId: avaliador.id, cursoId: curso.id } });
  await prisma.vinculoCoordenadorCurso.create({ data: { coordenadorId: coordenadorAdjunto.id, cursoId: curso.id } });
  await prisma.vinculoCoordenadorCurso.create({
    data: { coordenadorId: coordenadorOutroCurso.id, cursoId: outroCurso.id },
  });

  const tipoAtividade = await prisma.tipoAtividade.create({ data: { descricao: "Orientação de TCC" } });
  const relatorio = await prisma.relatorio.create({
    data: {
      docenteId: docente.id,
      cursoId: curso.id,
      periodoLetivoId: periodo.id,
      cargaHorariaTotal: 2,
      itens: {
        create: [
          {
            tipoAtividadeId: tipoAtividade.id,
            horas: 2,
            diaSemana: DiaSemana.SEGUNDA,
            horario: "14:00-16:00",
            descricao: "Orientação de TCC",
          },
        ],
      },
    },
  });

  return { docente, avaliador, coordenadorAdjunto, coordenadorOutroCurso, secretaria, relatorio };
}

function como(usuarioId: number) {
  usuarioLogado = usuarioId;
}

beforeEach(async () => {
  usuarioLogado = null;
  await limpar();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("rascunho é visível ao autor e à secretaria, mas não à coordenação (RF07)", async () => {
  const ambiente = await obterAmbiente();
  const id = ambiente.relatorio.id;

  como(ambiente.docente.id);
  await expect(exigirAcessoAoRelatorio(id, "visualizar")).resolves.toBeDefined();
  como(ambiente.secretaria.id);
  await expect(exigirAcessoAoRelatorio(id, "visualizar")).resolves.toBeDefined();

  como(ambiente.avaliador.id);
  await expect(exigirAcessoAoRelatorio(id, "visualizar")).rejects.toThrow();
  await expect(exigirAcessoAoRelatorio(id, "avaliar")).rejects.toThrow();
  como(ambiente.coordenadorAdjunto.id);
  await expect(exigirAcessoAoRelatorio(id, "visualizar")).rejects.toThrow();
});

test("depois de submetido, todo coordenador do curso lê, só o avaliador avalia e o de outro curso não enxerga", async () => {
  const ambiente = await obterAmbiente();
  const id = ambiente.relatorio.id;
  await submeter(id, ambiente.docente.id);

  como(ambiente.avaliador.id);
  await expect(exigirAcessoAoRelatorio(id, "avaliar")).resolves.toBeDefined();
  await expect(exigirAcessoAoRelatorio(id, "visualizar")).resolves.toBeDefined();

  como(ambiente.coordenadorAdjunto.id);
  await expect(exigirAcessoAoRelatorio(id, "visualizar")).resolves.toBeDefined();
  await expect(exigirAcessoAoRelatorio(id, "avaliar")).rejects.toThrow();

  como(ambiente.coordenadorOutroCurso.id);
  await expect(exigirAcessoAoRelatorio(id, "visualizar")).rejects.toThrow();
  await expect(exigirAcessoAoRelatorio(id, "avaliar")).rejects.toThrow();

  como(ambiente.secretaria.id);
  await expect(exigirAcessoAoRelatorio(id, "avaliar")).rejects.toThrow();
  await expect(exigirAcessoAoRelatorio(id, "editar")).rejects.toThrow();
});

test("usuário inativado perde o acesso mesmo com a sessão ainda válida", async () => {
  const ambiente = await obterAmbiente();
  como(ambiente.docente.id);
  await expect(exigirSessao()).resolves.toEqual({ usuarioId: ambiente.docente.id });

  await prisma.usuario.update({ where: { id: ambiente.docente.id }, data: { ativo: false } });
  await expect(exigirSessao()).rejects.toThrow("Usuário inativo");
  await expect(exigirAcessoAoRelatorio(ambiente.relatorio.id, "editar")).rejects.toThrow("Usuário inativo");
});

test("id que não é inteiro positivo nem chega ao banco", async () => {
  const ambiente = await obterAmbiente();
  como(ambiente.docente.id);
  await expect(exigirAcessoAoRelatorio(Number.NaN, "visualizar")).rejects.toThrow("Relatório não encontrado.");
  await expect(exigirAcessoAoRelatorio(-1, "visualizar")).rejects.toThrow("Relatório não encontrado.");
});
