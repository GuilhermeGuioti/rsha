"use server";

import { signOut } from "./config";

export async function acaoSair(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
