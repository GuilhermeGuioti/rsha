import path from "node:path";
import { Font } from "@react-pdf/renderer";

// O next/font do layout baixa as fontes para dentro do .next e serve por URL —
// não serve para o react-pdf, que lê o arquivo do disco na hora de renderizar.
// Por isso as fontes moram no repositório. `next.config.ts` inclui esta pasta
// no tracing da rota de download, senão os arquivos não sobem junto na Vercel.
//
// São os .woff publicados pela própria IBM (pacotes @ibm/plex-*, licença OFL em
// LICENSE.txt), e não os .ttf do Google Fonts: naquele build do Plex Mono o
// fontkit estoura ("Offset is outside the bounds of the DataView") já no glifo
// de espaço, porque a tabela loca aponta para fora do glyf.
const PASTA = path.join(process.cwd(), "lib", "pdf", "fontes");

let registradas = false;

export function registrarFontes(): void {
  if (registradas) {
    return;
  }

  Font.register({
    family: "IBM Plex Sans",
    fonts: [
      { src: path.join(PASTA, "IBMPlexSans-Regular.woff"), fontWeight: 400 },
      { src: path.join(PASTA, "IBMPlexSans-SemiBold.woff"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "IBM Plex Serif",
    fonts: [{ src: path.join(PASTA, "IBMPlexSerif-SemiBold.woff"), fontWeight: 600 }],
  });
  Font.register({
    family: "IBM Plex Mono",
    fonts: [{ src: path.join(PASTA, "IBMPlexMono-Medium.woff"), fontWeight: 500 }],
  });

  // Sem isto o react-pdf hifeniza pelas regras do inglês e quebra palavra em
  // português no lugar errado ("orienta-ção").
  Font.registerHyphenationCallback((palavra) => [palavra]);

  registradas = true;
}
