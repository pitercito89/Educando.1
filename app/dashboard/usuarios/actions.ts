"use server";

import { revalidatePath } from "next/cache";
import {
  createAuditLog,
  createSchoolUser,
  createTeacherSubjectAssignment,
  type UserRole,
} from "@/lib/db";
import { getSession } from "@/lib/auth";

export type UserFormState = {
  error: string | null;
  success: string | null;
};

export type TeacherSubjectState = {
  error: string | null;
  success: string | null;
};

const allowedRoles: UserRole[] = ["docente", "director"];
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{4,30}$/;

function parseId(value: FormDataEntryValue | null): number {
  return Number.parseInt(String(value ?? "").trim(), 10);
}

export async function createUserAction(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sesion no valida.", success: null };
  }
  if (session.role !== "admin") {
    return { error: "Solo el admin puede crear usuarios.", success: null };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as UserRole;

  if (!username || !password || !fullName || !role) {
    return { error: "Todos los campos son obligatorios.", success: null };
  }

  if (!allowedRoles.includes(role)) {
    return { error: "Rol no permitido.", success: null };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      error: "Usuario invalido. Usa 4-30 caracteres (letras, numeros, punto, guion o guion bajo).",
      success: null,
    };
  }
  if (password.length < 8) {
    return { error: "La contrasena debe tener al menos 8 caracteres.", success: null };
  }
  if (fullName.length < 3) {
    return { error: "Nombre completo demasiado corto.", success: null };
  }

  const result = await createSchoolUser({
    username,
    password,
    full_name: fullName,
    role: role as "docente" | "director",
  });

  if (result.error) {
    return { error: result.error, success: null };
  }

  const created = result.data?.[0];
  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "crear",
    entity_id: created ? String(created.id) : null,
    after_data: {
      username,
      full_name: fullName,
      role,
    },
  });

  revalidatePath("/dashboard/usuarios");
  return { error: null, success: "Usuario creado correctamente." };
}

export async function assignTeacherSubjectAction(
  _prevState: TeacherSubjectState,
  formData: FormData
): Promise<TeacherSubjectState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sesion no valida.", success: null };
  }
  if (session.role !== "admin") {
    return { error: "Solo admin puede asignar materias.", success: null };
  }

  const teacherUserId = parseId(formData.get("teacher_user_id"));
  const subjectId = parseId(formData.get("subject_id"));

  if (!Number.isInteger(teacherUserId) || !Number.isInteger(subjectId)) {
    return { error: "Docente y materia son obligatorios.", success: null };
  }

  const result = await createTeacherSubjectAssignment({
    teacher_user_id: teacherUserId,
    subject_id: subjectId,
  });
  if (result.error) {
    return { error: result.error, success: null };
  }

  const created = result.data?.[0];
  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "actualizar",
    entity_id: created ? String(created.id) : null,
    after_data: {
      teacher_user_id: teacherUserId,
      subject_id: subjectId,
    },
  });

  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard/calificaciones");
  return { error: null, success: "Materia asignada al docente correctamente." };
}
