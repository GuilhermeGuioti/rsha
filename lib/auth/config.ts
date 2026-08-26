import NextAuth from "next-auth";

// Esqueleto mínimo: zero providers por enquanto. O login falso de desenvolvimento
// (Credentials, NODE_ENV === "development") e o provider Microsoft Entra ID entram
// no passo dedicado a Auth.js — este arquivo só existe para lib/auth/guards.ts ter
// um auth() real para chamar, sem antecipar esse passo.
declare module "next-auth" {
  interface Session {
    usuarioId: number;
  }
}

export const { auth } = NextAuth({
  providers: [],
});
