"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  createAuditLog,
  getParentAuthById,
  getSchoolUserAuthById,
  getStudentAuthById,
  updateParentPassword,
  updateSchoolUserPassword,
  updateStudentPassword,
} from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/security";

export type PasswordFormState = {
  error: string | null;
  success: string | null;
};

export async function changeOwnPasswordAction(
  _prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const session = await getSession();
  if (!session) return { error: "Sesion no valida.", success: null };

  const currentPassword = String(formData.get("current_password") ?? "").trim();
  const newPassword = String(formData.get("new_password") ?? "").trim();
  const confirmPassword = String(formData.get("confirm_password") ?? "").trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Completa todos los campos.", success: null };
  }
  if (newPassword.length < 8) {
    return { error: "La nueva contrasena debe tener al menos 8 caracteres.", success: null };
  }
  if (newPassword !== confirmPassword) {
    return { error: "La confirmacion no coincide con la nueva contrasena.", success: null };
  }

  let storedHash: string | null = null;
  let updateResultError: string | null = null;
  const newHash = await hashPassword(newPassword);

  if (session.role === "admin" || session.role === "docente" || session.role === "director") {
    if (!session.schoolUserId) return { error: "Cuenta no valida.", success: null };
    const userResult = await getSchoolUserAuthById(session.schoolUserId);
    if (userResult.error || !userResult.data) {
      return { error: userResult.error ?? "No se encontro la cuenta.", success: null };
    }
    storedHash = userResult.data.password;
    const ok = await verifyPassword(currentPassword, storedHash);
    if (!ok) return { error: "La contrasena actual es incorrecta.", success: null };
    const updateResult = await updateSchoolUserPassword(session.schoolUserId, newHash);
    updateResultError = updateResult.error;
  } else if (session.role === "estudiante") {
    if (!session.studentId) return { error: "Cuenta no valida.", success: null };
    const userResult = await getStudentAuthById(session.studentId);
    if (userResult.error || !userResult.data) {
      return { error: userResult.error ?? "No se encontro la cuenta.", success: null };
    }
    storedHash = userResult.data.password;
    const ok = await verifyPassword(currentPassword, storedHash);
    if (!ok) return { error: "La contrasena actual es incorrecta.", success: null };
    const updateResult = await updateStudentPassword(session.studentId, newHash);
    updateResultError = updateResult.error;
  } else if (session.role === "padre") {
    if (!session.parentId) return { error: "Cuenta no valida.", success: null };
    const userResult = await getParentAuthById(session.parentId);
    if (userResult.error || !userResult.data) {
      return { error: userResult.error ?? "No se encontro la cuenta.", success: null };
    }
    storedHash = userResult.data.password;
    const ok = await verifyPassword(currentPassword, storedHash);
    if (!ok) return { error: "La contrasena actual es incorrecta.", success: null };
    const updateResult = await updateParentPassword(session.parentId, newHash);
    updateResultError = updateResult.error;
  }

  if (updateResultError) return { error: updateResultError, success: null };

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "actualizar",
    after_data: { password_changed_by_owner: true },
  });

  revalidatePath("/dashboard/cuenta");
  return { error: null, success: "Contrasena actualizada correctamente." };
}

