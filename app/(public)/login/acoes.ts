"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "../../../lib/auth/config";

async function entrarComEmail(email: string): Promise<void> {
  try {
    await signIn("dev", { email, redirectTo: "/" });
  } catch (erro) {
    if (erro instanceof AuthError) {
      redirect("/login?erro=1");
    }
    throw erro;
  }
}

// Sem provider Microsoft ainda (passo 12): entra direto com o único usuário
// hoje cadastrado (o admin de prisma/seed.ts). Quando o Entra ID entrar, este
// botão passa a redirecionar para lá em vez de logar direto.
export async function acaoEntrar(): Promise<void> {
  await entrarComEmail("admin@srha.dev");
}

// Login falso com e-mail arbitrário, só pra testar como outro usuário
// cadastrado (docente, coordenador etc.) sem precisar do Microsoft.
export async function acaoEntrarComEmail(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  await entrarComEmail(email);
}
