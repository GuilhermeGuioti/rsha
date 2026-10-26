import { renderToBuffer } from "@react-pdf/renderer";
import { exigirAcessoAoRelatorio } from "../../../../../lib/auth/guards";
import { codigoRelatorio } from "../../../../../lib/formato";
import { DocumentoRelatorio } from "../../../../../lib/pdf/documento-relatorio";
import { registrarFontes } from "../../../../../lib/pdf/fontes";
import { gerarCodigoAutenticidade } from "../../../../../lib/services/autenticidade";
import { obterRelatorioAprovadoParaPdf, type RelatorioExportado } from "../../../../../lib/services/relatorios";

// Uma das três exceções à regra "sem API REST" (ver CLAUDE.md): Server Action
// não devolve arquivo com Content-Disposition. O PDF é gerado sob demanda a
// partir dos dados — nada é armazenado.
export const runtime = "nodejs";

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro inesperado.";
}

// O nome do arquivo viaja num cabeçalho HTTP: sem acento e sem espaço, para
// não depender de filename* nem quebrar em cliente antigo.
function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(requisicao: Request, { params }: { params: Promise<{ id: string }> }) {
  const relatorioId = Number((await params).id);
  if (!Number.isInteger(relatorioId)) {
    return new Response("Identificador de relatório inválido.", { status: 400 });
  }

  // Guard na primeira linha: esta rota tem endpoint público e é chamável com
  // curl — esconder o link na tela não é controle de acesso (RF02).
  try {
    await exigirAcessoAoRelatorio(relatorioId, "visualizar");
  } catch (erro) {
    return new Response(mensagem(erro), { status: 403 });
  }

  let dados: RelatorioExportado;
  try {
    dados = await obterRelatorioAprovadoParaPdf(relatorioId);
  } catch (erro) {
    return new Response(mensagem(erro), { status: 409 });
  }

  // Sem chave configurada o PDF não sai: uma via sem carimbo não teria como
  // ser conferida depois.
  let codigoAutenticidade: string;
  try {
    codigoAutenticidade = gerarCodigoAutenticidade(dados.id, dados.aprovadoEm);
  } catch (erro) {
    return new Response(mensagem(erro), { status: 500 });
  }
  // Endereço do próprio ambiente que emitiu o PDF, sem variável de ambiente a
  // mais para manter em dia.
  const enderecoValidacao = new URL("/validar", requisicao.url).toString();

  registrarFontes();
  const pdf = await renderToBuffer(
    <DocumentoRelatorio
      dados={dados}
      geradoEm={new Date()}
      codigoAutenticidade={codigoAutenticidade}
      enderecoValidacao={enderecoValidacao}
    />,
  );

  const arquivo = `${codigoRelatorio(dados.ano, dados.semestre, dados.id)}-${semAcento(dados.docente)}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      // Documento com dado pessoal: nenhum cache intermediário guarda cópia.
      "Cache-Control": "private, no-store",
    },
  });
}
