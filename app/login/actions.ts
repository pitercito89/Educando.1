"use server";

import { redirect } from "next/navigation";
import { createSession, validateCredentials } from "@/lib/auth";

export type LoginState = {
  error: string | null;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!username || !password) {
    return { error: "Usuario y contrasena son obligatorios." };
  }
  if (username.length < 4 || username.length > 40) {
    return { error: "Usuario invalido." };
  }
  if (password.length < 8 || password.length > 120) {
    return { error: "Contrasena invalida." };
  }

  const user = await validateCredentials(username, password);

  if (!user) {
    return { error: "Credenciales invalidas." };
  }

  await createSession(user);
  redirect("/dashboard");
}
