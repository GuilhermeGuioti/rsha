"use server";

import { signIn } from "../../lib/auth/config";

// Sem provider Microsoft ainda (passo 12): entra direto com o único usuário
// hoje cadastrado (o admin de prisma/seed.ts). Quando o Entra ID entrar, este
// botão passa a redirecionar para lá em vez de logar direto.
export async function acaoEntrar(): Promise<void> {
  await signIn("dev", { email: "admin@srha.dev", redirectTo: "/" });
}

// Login falso com e-mail arbitrário, só pra testar como outro usuário
// cadastrado (docente, coordenador etc.) sem precisar do Microsoft.
export async function acaoEntrarComEmail(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  await signIn("dev", { email, redirectTo: "/" });
}
