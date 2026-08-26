import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7 usa um compilador de queries em WASM (arquivos .mjs dentro do
  // pacote) que precisa passar pelo mesmo transpile do resto do projeto —
  // sem isso o Jest (e o bundler) tentam carregar ESM puro como CJS e quebram.
  transpilePackages: ["@prisma/client"],
};

export default nextConfig;
