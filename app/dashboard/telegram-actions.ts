"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { assignTelegramCode } from "@/lib/db";

export type TelegramCodeState = {
  error: string | null;
  success: string | null;
  code: string | null;
};

function generateCode(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export async function generateStudentTelegramCodeAction(
  prevState: TelegramCodeState
): Promise<TelegramCodeState> {
  void prevState;
  const session = await getSession();
  if (!session || session.role !== "estudiante" || !session.studentId) {
    return { error: "Sesion invalida para generar codigo.", success: null, code: null };
  }

  const code = generateCode("STD");
  const result = await assignTelegramCode({
    role: "estudiante",
    id: session.studentId,
    code,
  });
  if (result.error) {
    return { error: result.error, success: null, code: null };
  }

  revalidatePath("/dashboard");
  return { error: null, success: "Codigo generado correctamente.", code };
}

export async function generateParentTelegramCodeAction(
  prevState: TelegramCodeState
): Promise<TelegramCodeState> {
  void prevState;
  const session = await getSession();
  if (!session || session.role !== "padre" || !session.parentId) {
    return { error: "Sesion invalida para generar codigo.", success: null, code: null };
  }

  const code = generateCode("PAD");
  const result = await assignTelegramCode({
    role: "padre",
    id: session.parentId,
    code,
  });
  if (result.error) {
    return { error: result.error, success: null, code: null };
  }

  revalidatePath("/dashboard");
  return { error: null, success: "Codigo generado correctamente.", code };
}
