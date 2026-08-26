"use server";

import { signOut } from "../lib/auth/config";

export async function acaoSair(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
