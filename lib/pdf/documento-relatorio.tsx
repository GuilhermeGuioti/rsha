import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { TipoEvento } from "../../generated/prisma/enums";
import { codigoRelatorio, formatarDataHora, formatarHoras, ROTULO_DIA_SEMANA, ROTULO_EVENTO } from "../formato";
import type { RelatorioExportado } from "../services/relatorios";

// As mesmas variáveis de app/globals.css — o PDF é a via impressa da mesma
// tela, não um documento com identidade própria.
const COR = {
  azulInterativo: "#00679e",
  tinta: "#14181f",
  tintaSuave: "#5a6572",
  borda: "#dde3ea",
  papel: "#f7f8fa",
  aprovado: "#1e7a46",
  aguardando: "#b26a00",
  devolvido: "#b3261e",
};

const estilos = StyleSheet.create({
  // Sem `lineHeight` aqui de propósito: herdado pela página inteira, ele zera a
  // caixa dos nós dinâmicos do react-pdf (a prop `render` do número de página)
  // e o texto some do PDF sem erro nenhum. Vai só onde há parágrafo de fato.
  pagina: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: "IBM Plex Sans",
    fontSize: 9,
    color: COR.tinta,
  },

  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: COR.borda,
    paddingBottom: 14,
  },
  codigo: { fontFamily: "IBM Plex Mono", fontSize: 7.5, letterSpacing: 1, color: COR.tintaSuave },
  titulo: { fontFamily: "IBM Plex Serif", fontSize: 16, color: COR.azulInterativo, marginTop: 5 },
  subtitulo: { fontSize: 9.5, color: COR.tintaSuave, marginTop: 3 },
  selo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: COR.aprovado,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  seloMarcador: { width: 6, height: 6, borderRadius: 3, backgroundColor: COR.aprovado },
  seloTexto: { fontSize: 8.5, fontWeight: 600, color: COR.aprovado },

  identificacao: { flexDirection: "row", flexWrap: "wrap", marginTop: 14 },
  campo: { width: "50%", paddingRight: 12, marginBottom: 9 },
  rotulo: { fontSize: 7.5, letterSpacing: 0.4, color: COR.tintaSuave, textTransform: "uppercase" },
  valor: { fontSize: 10, marginTop: 2 },

  secao: { fontFamily: "IBM Plex Serif", fontSize: 12, color: COR.azulInterativo, marginTop: 16, marginBottom: 7 },

  cabecalhoTabela: {
    flexDirection: "row",
    backgroundColor: COR.papel,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COR.borda,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  colunaRotulo: { fontSize: 7.5, letterSpacing: 0.4, color: COR.tintaSuave, textTransform: "uppercase" },
  linha: { borderBottomWidth: 1, borderBottomColor: COR.borda, paddingVertical: 6, paddingHorizontal: 7 },
  linhaTopo: { flexDirection: "row" },
  colAtividade: { width: "42%", paddingRight: 8 },
  colDia: { width: "18%", paddingRight: 8 },
  colHorario: { width: "22%", paddingRight: 8 },
  colHoras: { width: "18%", textAlign: "right" },
  mono: { fontFamily: "IBM Plex Mono" },
  descricao: { color: COR.tintaSuave, marginTop: 3, lineHeight: 1.45 },
  vazio: { color: COR.tintaSuave, paddingVertical: 10, paddingHorizontal: 7 },

  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 7,
    borderBottomWidth: 2,
    borderBottomColor: COR.azulInterativo,
  },
  totalRotulo: { fontSize: 10, fontWeight: 600 },
  totalValor: { fontFamily: "IBM Plex Mono", fontSize: 13, fontWeight: 600, color: COR.azulInterativo },

  aprovacao: {
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: COR.aprovado,
    backgroundColor: COR.papel,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  aprovacaoTitulo: { fontSize: 10, fontWeight: 600, color: COR.aprovado },

  evento: { flexDirection: "row", marginBottom: 8 },
  eventoData: { width: 92, fontFamily: "IBM Plex Mono", fontSize: 8, color: COR.tintaSuave, paddingTop: 1 },
  eventoCorpo: { flex: 1 },
  eventoRotulo: { fontSize: 9.5, fontWeight: 600 },
  eventoAutor: { fontSize: 8.5, color: COR.tintaSuave, marginTop: 1 },
  justificativa: {
    marginTop: 3,
    borderLeftWidth: 2,
    borderLeftColor: COR.borda,
    paddingLeft: 7,
    paddingVertical: 2,
    color: COR.tintaSuave,
    lineHeight: 1.45,
  },

  // Régua e rodapé são posicionados fora do fluxo, repetidos em toda página.
  // A régua precisa de altura própria: View absoluta só com borda não desenha.
  regua: { position: "absolute", bottom: 38, left: 44, right: 44, height: 1, backgroundColor: COR.borda },
  rodape: { position: "absolute", bottom: 26, fontSize: 7.5, color: COR.tintaSuave },
  rodapeEsquerda: { left: 44 },
  rodapeDireita: { right: 44 },
});

const COR_EVENTO: Record<TipoEvento, string> = {
  CRIACAO: COR.tinta,
  SUBMISSAO: COR.aguardando,
  DEVOLUCAO: COR.devolvido,
  APROVACAO: COR.aprovado,
};

function Campo({ rotulo, children }: { rotulo: string; children: string }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>{children}</Text>
    </View>
  );
}

export function DocumentoRelatorio({ dados, geradoEm }: { dados: RelatorioExportado; geradoEm: Date }) {
  const codigo = codigoRelatorio(dados.ano, dados.semestre, dados.id);
  const periodo = `${dados.semestre}º semestre de ${dados.ano}`;

  return (
    <Document
      title={`${codigo} — ${dados.docente}`}
      author={dados.docente}
      subject={`Relatório de horas atividades · ${dados.curso} · ${periodo}`}
      creator="SRHA"
      producer="SRHA"
    >
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecalho} fixed>
          <View>
            <Text style={estilos.codigo}>{codigo}</Text>
            <Text style={estilos.titulo}>Relatório de Horas Atividades</Text>
            <Text style={estilos.subtitulo}>
              {dados.curso} · {periodo}
            </Text>
          </View>
          {/* Cor nunca é o único portador de estado: marcador + palavra. */}
          <View style={estilos.selo}>
            <View style={estilos.seloMarcador} />
            <Text style={estilos.seloTexto}>APROVADO</Text>
          </View>
        </View>

        <View style={estilos.identificacao}>
          <Campo rotulo="Docente">{dados.docente}</Campo>
          <Campo rotulo="Correio eletrônico">{dados.emailDocente}</Campo>
          <Campo rotulo="Curso">{dados.curso}</Campo>
          <Campo rotulo="Período letivo">{periodo}</Campo>
        </View>

        <Text style={estilos.secao}>Atividades declaradas</Text>

        <View style={estilos.cabecalhoTabela} fixed>
          <Text style={[estilos.colunaRotulo, estilos.colAtividade]}>Tipo de atividade</Text>
          <Text style={[estilos.colunaRotulo, estilos.colDia]}>Dia</Text>
          <Text style={[estilos.colunaRotulo, estilos.colHorario]}>Horário</Text>
          <Text style={[estilos.colunaRotulo, estilos.colHoras]}>Horas</Text>
        </View>

        {dados.itens.length === 0 ? (
          <Text style={estilos.vazio}>Nenhuma atividade declarada.</Text>
        ) : (
          dados.itens.map((item, indice) => (
            <View key={indice} style={estilos.linha} wrap={false}>
              <View style={estilos.linhaTopo}>
                <Text style={estilos.colAtividade}>{item.tipoAtividade}</Text>
                <Text style={estilos.colDia}>{ROTULO_DIA_SEMANA[item.diaSemana]}</Text>
                <Text style={[estilos.colHorario, estilos.mono]}>{item.horario}</Text>
                <Text style={[estilos.colHoras, estilos.mono]}>{formatarHoras(item.horas)}</Text>
              </View>
              <Text style={estilos.descricao}>{item.descricao}</Text>
            </View>
          ))
        )}

        <View style={estilos.total} wrap={false}>
          <Text style={estilos.totalRotulo}>
            Total declarado ({dados.itens.length} {dados.itens.length === 1 ? "atividade" : "atividades"})
          </Text>
          <Text style={estilos.totalValor}>{formatarHoras(dados.cargaHorariaTotal)} h</Text>
        </View>

        <View style={estilos.aprovacao} wrap={false}>
          <Text style={estilos.aprovacaoTitulo}>Aprovado pela coordenação</Text>
          <Text style={{ marginTop: 3 }}>
            {dados.aprovadoPor} · <Text style={estilos.mono}>{formatarDataHora(dados.aprovadoEm)}</Text>
          </Text>
        </View>

        <Text style={estilos.secao}>Trilha de auditoria</Text>
        {dados.eventos.map((evento, indice) => (
          <View key={indice} style={estilos.evento} wrap={false}>
            <Text style={estilos.eventoData}>{formatarDataHora(evento.ocorridoEm)}</Text>
            <View style={estilos.eventoCorpo}>
              <Text style={[estilos.eventoRotulo, { color: COR_EVENTO[evento.tipo] }]}>
                {ROTULO_EVENTO[evento.tipo]}
              </Text>
              <Text style={estilos.eventoAutor}>{evento.autor}</Text>
              {evento.justificativa && <Text style={estilos.justificativa}>{evento.justificativa}</Text>}
            </View>
          </View>
        ))}

        <View style={estilos.regua} fixed />
        <Text style={[estilos.rodape, estilos.rodapeEsquerda]} fixed>
          {codigo} · gerado em {formatarDataHora(geradoEm)}
        </Text>
        <Text
          style={[estilos.rodape, estilos.rodapeDireita]}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
