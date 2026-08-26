import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "../db";

declare module "next-auth" {
  interface Session {
    usuarioId: number;
  }
}

// Provider Microsoft Entra ID entra no passo 12. Até lá, só o login falso de
// desenvolvimento (CLAUDE.md § Login falso para desenvolvimento).
const providerDev = Credentials({
  id: "dev",
  name: "Login de desenvolvimento",
  credentials: { email: { label: "E-mail", type: "text" } },
  async authorize(credentials) {
    const email = typeof credentials?.email === "string" ? credentials.email : undefined;
    if (!email) return null;
    // Não achou de jeito nenhum: nega o acesso. Nunca cria usuário automaticamente.
    const usuario = await prisma.usuario.findUnique({ where: { email, ativo: true } });
    if (!usuario) return null;
    return { id: String(usuario.id), name: usuario.nome, email: usuario.email };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: process.env.NODE_ENV === "development" ? [providerDev] : [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.usuarioId = Number(user.id);
      }
      return token;
    },
    async session({ session, token }) {
      session.usuarioId = token.usuarioId as number;
      return session;
    },
  },
});
