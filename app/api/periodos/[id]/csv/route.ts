import { exigirPerfil } from "../../../../../lib/auth/guards";
import { Perfil } from "../../../../../generated/prisma/client";
import { extrairPeriodo, type ExtracaoPeriodo } from "../../../../../lib/services/extracao";

// Uma das três exceções à regra "sem API REST" (ver CLAUDE.md): Server Action
// não devolve arquivo com Content-Disposition. A planilha é gerada sob demanda
// a partir dos dados — nada é armazenado.
export const runtime = "nodejs";

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro inesperado.";
}

export async function GET(_requisicao: Request, { params }: { params: Promise<{ id: string }> }) {
  // Guard na primeira linha: esta rota tem endpoint público e é chamável com
  // curl — esconder o botão na tela não é controle de acesso (RF02). A
  // extração é da secretaria (RF21).
  try {
    await exigirPerfil(Perfil.SECRETARIA);
  } catch (erro) {
    return new Response(mensagem(erro), { status: 403 });
  }

  const periodoLetivoId = Number((await params).id);
  if (!Number.isInteger(periodoLetivoId) || periodoLetivoId <= 0) {
    return new Response("Identificador de período inválido.", { status: 400 });
  }

  let extracao: ExtracaoPeriodo;
  try {
    extracao = await extrairPeriodo(periodoLetivoId);
  } catch (erro) {
    return new Response(mensagem(erro), { status: 404 });
  }

  return new Response(extracao.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="srha-extracao-${extracao.ano}-${extracao.semestre}.csv"`,
      // Planilha com dado pessoal: nenhum cache intermediário guarda cópia.
      "Cache-Control": "private, no-store",
    },
  });
}
