import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { codigoRelatorio, formatarData, formatarDataHora, formatarHoras, ROTULO_DIA_SEMANA, ROTULO_EVENTO } from "../formato";
import { MARCADOR_PDF } from "../services/autenticidade";
import type { RelatorioExportado } from "../services/relatorios";

// O PDF segue o modelo de papel da instituição ("Modelo - Relatório de Horas
// Atividades.docx"): cabeçalho com a logo, título centralizado e os campos no
// formato "Rótulo: valor". O modelo traz uma atividade por folha; aqui cada
// item vira uma linha da tabela, com a descrição logo abaixo.
//
// As assinaturas do modelo dão lugar à validação eletrônica: a autoria e a
// aprovação são comprovadas pela sessão autenticada registrada na trilha, sem
// campo de assinatura manuscrita (RF11; docreq §4.3 descartou o Gov.br). O
// carimbo de autenticidade (código + endereço de validação) deixa quem recebe
// o papel conferir que ele saiu do SRHA — ver lib/services/autenticidade.ts.

// Faixa com a logo, recortada do cabeçalho do modelo e convertida de CMYK para
// RGB. Lida do disco como as fontes — `next.config.ts` inclui a pasta no
// tracing da rota de download.
const CABECALHO = path.join(process.cwd(), "lib", "pdf", "imagens", "cabecalho-institucional.jpg");

const COR = {
  tinta: "#1a1a1a",
  tintaSuave: "#4f5660",
  linha: "#9aa1a9",
  fundo: "#eef0f2",
};

// Margens do modelo: 1,5 cm nas laterais; a faixa da logo ocupa a largura útil.
const MARGEM = 42.5;
const LARGURA_UTIL = 595.28 - 2 * MARGEM;
const ALTURA_CABECALHO = LARGURA_UTIL * (225 / 2163);

// Estilo com `lineHeight` declara o próprio `fontSize`: o react-pdf multiplica
// o valor sem unidade pelo tamanho do mesmo estilo, não pelo herdado — sem ele,
// usa 18 pt e o parágrafo sai com espaço duplo.
const CORPO = 9.5;

const estilos = StyleSheet.create({
  // Sem `lineHeight` aqui de propósito: herdado pela página inteira, ele zera a
  // caixa dos nós dinâmicos do react-pdf (a prop `render` do número de página)
  // e o texto some do PDF sem erro nenhum. Vai só onde há parágrafo de fato.
  pagina: {
    paddingTop: 21 + ALTURA_CABECALHO + 22,
    paddingBottom: 60,
    paddingHorizontal: MARGEM,
    fontFamily: "IBM Plex Sans",
    fontSize: CORPO,
    color: COR.tinta,
  },

  cabecalho: { position: "absolute", top: 21, left: MARGEM, width: LARGURA_UTIL, height: ALTURA_CABECALHO },

  titulo: { fontSize: 12, fontWeight: 600, textAlign: "center", letterSpacing: 0.6 },
  codigo: {
    fontFamily: "IBM Plex Mono",
    fontSize: 7.5,
    letterSpacing: 1,
    color: COR.tintaSuave,
    textAlign: "center",
    marginTop: 4,
  },

  identificacao: { marginTop: 18 },
  campo: { fontSize: CORPO, lineHeight: 1.35, marginBottom: 4 },
  negrito: { fontWeight: 600 },

  secao: {
    fontSize: CORPO,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: COR.tinta,
    paddingBottom: 3,
    marginTop: 20,
    marginBottom: 8,
  },

  // Cada linha tem moldura completa e sobe o equivalente a uma borda sobre a
  // anterior, para as duas não somarem espessura: a tabela que quebra entre
  // páginas fecha embaixo numa e abre emoldurada na outra.
  tabelaCabecalho: {
    flexDirection: "row",
    backgroundColor: COR.fundo,
    borderWidth: 0.75,
    borderColor: COR.linha,
  },
  tabelaLinha: { borderWidth: 0.75, borderColor: COR.linha, marginTop: -0.75 },
  linhaTopo: { flexDirection: "row" },
  celula: { paddingVertical: 5, paddingHorizontal: 6 },
  celulaCabecalho: { fontSize: 8, fontWeight: 600 },
  divisoria: { borderLeftWidth: 0.75, borderLeftColor: COR.linha },

  colNumero: { width: "7%", textAlign: "center" },
  colAtividade: { width: "41%" },
  colDiaHorario: { width: "36%" },
  colHoras: { width: "16%", textAlign: "right" },

  descricao: {
    borderTopWidth: 0.5,
    borderTopColor: COR.linha,
    borderStyle: "dashed",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: CORPO,
    lineHeight: 1.4,
    textAlign: "justify",
  },
  // Um ponto abaixo do corpo: a Plex Mono é mais larga e pesada que a Sans.
  mono: { fontFamily: "IBM Plex Mono", fontSize: 8.5 },
  vazio: { color: COR.tintaSuave },

  total: { flexDirection: "row", backgroundColor: COR.fundo },
  totalRotulo: { width: "84%", fontWeight: 600, textAlign: "right" },
  totalValor: { width: "16%", fontFamily: "IBM Plex Mono", textAlign: "right" },

  validacao: { flexDirection: "row", gap: 12 },
  quadro: { flex: 1, borderWidth: 0.75, borderColor: COR.linha, paddingVertical: 8, paddingHorizontal: 10 },
  quadroRotulo: { fontSize: 7.5, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: COR.tintaSuave },
  quadroNome: { fontSize: 10.5, fontWeight: 600, marginTop: 5 },
  quadroAto: { marginTop: 3, color: COR.tintaSuave },
  nota: { marginTop: 8, fontSize: 8, color: COR.tintaSuave, lineHeight: 1.4, textAlign: "justify" },
  data: { marginTop: 10 },
  carimbo: {
    marginTop: 10,
    borderWidth: 0.75,
    borderColor: COR.tinta,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  carimboCodigo: { fontFamily: "IBM Plex Mono", fontSize: 12, letterSpacing: 1.5, marginTop: 5 },
  carimboInstrucao: { marginTop: 4, fontSize: 8, color: COR.tintaSuave, lineHeight: 1.4 },

  colEventoData: { width: "21%" },
  colEventoTipo: { width: "31%" },
  colEventoAutor: { width: "48%" },
  justificativa: {
    borderTopWidth: 0.5,
    borderTopColor: COR.linha,
    borderStyle: "dashed",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: CORPO,
    lineHeight: 1.4,
  },

  // Régua e rodapé são posicionados fora do fluxo, repetidos em toda página.
  // A régua precisa de altura própria: View absoluta só com borda não desenha.
  regua: { position: "absolute", bottom: 40, left: MARGEM, right: MARGEM, height: 0.75, backgroundColor: COR.linha },
  rodape: { position: "absolute", bottom: 27, fontSize: 7.5, color: COR.tintaSuave },
  rodapeEsquerda: { left: MARGEM },
  rodapeDireita: { right: MARGEM },
});

function Campo({ rotulo, children }: { rotulo: string; children: string }) {
  return (
    <Text style={estilos.campo}>
      <Text style={estilos.negrito}>{rotulo}: </Text>
      {children}
    </Text>
  );
}

function Quadro({ rotulo, nome, ato }: { rotulo: string; nome: string; ato: string }) {
  return (
    <View style={estilos.quadro}>
      <Text style={estilos.quadroRotulo}>{rotulo}</Text>
      <Text style={estilos.quadroNome}>{nome}</Text>
      <Text style={estilos.quadroAto}>{ato}</Text>
    </View>
  );
}

export function DocumentoRelatorio({
  dados,
  geradoEm,
  codigoAutenticidade,
  enderecoValidacao,
}: {
  dados: RelatorioExportado;
  geradoEm: Date;
  codigoAutenticidade: string;
  enderecoValidacao: string;
}) {
  const codigo = codigoRelatorio(dados.ano, dados.semestre, dados.id);
  const periodo = `${dados.semestre}º semestre de ${dados.ano}`;

  return (
    <Document
      title={`${codigo} — ${dados.docente}`}
      author={dados.docente}
      subject={`Relatório de horas atividades · ${dados.curso} · ${periodo}`}
      keywords={`${MARCADOR_PDF}${codigoAutenticidade}`}
      creator="SRHA"
      producer="SRHA"
    >
      <Page size="A4" style={estilos.pagina}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não tem alt */}
        <Image src={CABECALHO} style={estilos.cabecalho} fixed />

        <Text style={estilos.titulo}>RELATÓRIO DE HORAS ATIVIDADES</Text>
        <Text style={estilos.codigo}>{codigo}</Text>

        <View style={estilos.identificacao}>
          <Campo rotulo="Curso">{dados.curso.toUpperCase()}</Campo>
          <Campo rotulo="Nome do Docente">{dados.docente}</Campo>
          <Campo rotulo="E-mail institucional">{dados.emailDocente}</Campo>
          <Campo rotulo="Período Letivo">{periodo}</Campo>
        </View>

        <Text style={estilos.secao}>Atividades realizadas</Text>

        <View style={estilos.tabelaCabecalho}>
          <Text style={[estilos.celula, estilos.celulaCabecalho, estilos.colNumero]}>Nº</Text>
          <Text style={[estilos.celula, estilos.celulaCabecalho, estilos.colAtividade, estilos.divisoria]}>
            Tipo de Atividade
          </Text>
          <Text style={[estilos.celula, estilos.celulaCabecalho, estilos.colDiaHorario, estilos.divisoria]}>
            Dia da Semana e Horário
          </Text>
          <Text style={[estilos.celula, estilos.celulaCabecalho, estilos.colHoras, estilos.divisoria]}>Horas</Text>
        </View>

        {dados.itens.length === 0 ? (
          <View style={estilos.tabelaLinha}>
            <Text style={[estilos.celula, estilos.vazio]}>Nenhuma atividade declarada.</Text>
          </View>
        ) : (
          dados.itens.map((item, indice) => (
            <View key={indice} style={estilos.tabelaLinha} wrap={false}>
              <View style={estilos.linhaTopo}>
                <Text style={[estilos.celula, estilos.colNumero, estilos.mono]}>{indice + 1}</Text>
                <Text style={[estilos.celula, estilos.colAtividade, estilos.divisoria]}>{item.tipoAtividade}</Text>
                <Text style={[estilos.celula, estilos.colDiaHorario, estilos.divisoria]}>
                  {ROTULO_DIA_SEMANA[item.diaSemana]}, <Text style={estilos.mono}>{item.horario}</Text>
                </Text>
                <Text style={[estilos.celula, estilos.colHoras, estilos.mono, estilos.divisoria]}>
                  {formatarHoras(item.horas)}
                </Text>
              </View>
              <Text style={estilos.descricao}>
                <Text style={estilos.negrito}>Descrição das atividades realizadas: </Text>
                {item.descricao}
              </Text>
            </View>
          ))
        )}

        <View style={[estilos.tabelaLinha, estilos.total]} wrap={false}>
          <Text style={[estilos.celula, estilos.totalRotulo]}>Total de horas atividades</Text>
          <Text style={[estilos.celula, estilos.totalValor, estilos.divisoria]}>
            {formatarHoras(dados.cargaHorariaTotal)}
          </Text>
        </View>

        <View wrap={false}>
          <Text style={estilos.secao}>Validação eletrônica</Text>
          <View style={estilos.validacao}>
            <Quadro
              rotulo="Docente"
              nome={dados.docente}
              ato={`Enviado para avaliação em ${formatarDataHora(dados.enviadoEm)}`}
            />
            <Quadro
              rotulo="Coordenação do curso"
              nome={dados.aprovadoPor}
              ato={`Aprovado em ${formatarDataHora(dados.aprovadoEm)}`}
            />
          </View>
          <Text style={estilos.nota}>
            Documento validado eletronicamente pelo SRHA, dispensada a assinatura manuscrita. A autoria e a aprovação
            são comprovadas pela sessão institucional autenticada de cada responsável, registrada na trilha de
            auditoria a seguir.
          </Text>
          <View style={estilos.data}>
            <Campo rotulo="Data">{formatarData(dados.aprovadoEm)}</Campo>
          </View>
          <View style={estilos.carimbo}>
            <Text style={estilos.quadroRotulo}>Código de autenticidade</Text>
            <Text style={estilos.carimboCodigo}>{codigoAutenticidade}</Text>
            <Text style={estilos.carimboInstrucao}>
              Confira a autenticidade deste documento em {enderecoValidacao}, anexando este PDF ou digitando o código.
            </Text>
          </View>
        </View>

        <Text style={estilos.secao}>Trilha de auditoria</Text>

        <View style={estilos.tabelaCabecalho}>
          <Text style={[estilos.celula, estilos.celulaCabecalho, estilos.colEventoData]}>Data e hora</Text>
          <Text style={[estilos.celula, estilos.celulaCabecalho, estilos.colEventoTipo, estilos.divisoria]}>
            Evento
          </Text>
          <Text style={[estilos.celula, estilos.celulaCabecalho, estilos.colEventoAutor, estilos.divisoria]}>
            Responsável
          </Text>
        </View>
        {dados.eventos.map((evento, indice) => (
          <View key={indice} style={estilos.tabelaLinha} wrap={false}>
            <View style={estilos.linhaTopo}>
              <Text style={[estilos.celula, estilos.colEventoData, estilos.mono]}>
                {formatarDataHora(evento.ocorridoEm)}
              </Text>
              <Text style={[estilos.celula, estilos.colEventoTipo, estilos.divisoria]}>
                {ROTULO_EVENTO[evento.tipo]}
              </Text>
              <Text style={[estilos.celula, estilos.colEventoAutor, estilos.divisoria]}>{evento.autor}</Text>
            </View>
            {evento.justificativa && (
              <Text style={estilos.justificativa}>
                <Text style={estilos.negrito}>Justificativa: </Text>
                {evento.justificativa}
              </Text>
            )}
          </View>
        ))}

        <View style={estilos.regua} fixed />
        <Text style={[estilos.rodape, estilos.rodapeEsquerda]} fixed>
          {codigo} · autenticidade {codigoAutenticidade} · gerado em {formatarDataHora(geradoEm)}
        </Text>
        <Text
          style={[estilos.rodape, estilos.rodapeDireita]}
          fixed
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
