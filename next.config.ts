import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7 usa um compilador de queries em WASM (arquivos .mjs dentro do
  // pacote) que precisa passar pelo mesmo transpile do resto do projeto —
  // sem isso o Jest (e o bundler) tentam carregar ESM puro como CJS e quebram.
  transpilePackages: ["@prisma/client"],

  // Os arquivos da IBM Plex são lidos do disco na hora de gerar o PDF; sem
  // isto o tracing da Vercel não sobe a pasta junto com a função da rota.
  outputFileTracingIncludes: {
    "/api/relatorios/[id]/pdf": ["./lib/pdf/fontes/**"],
  },
};

export default nextConfig;
