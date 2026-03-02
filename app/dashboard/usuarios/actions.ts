"use server";

import { revalidatePath } from "next/cache";
import {
  createAuditLog,
  createSchoolUser,
  createTeacherSubjectAssignment,
  deleteTeacherAssignmentsByTeacher,
  graduateStudentsCourse,
  promoteStudentsCourse,
  updateParentPassword,
  updateParentProfile,
  updateSchoolUserPassword,
  updateSchoolUserProfile,
  updateStudentPassword,
  updateStudentProfile,
  type UserRole,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/security";

export type UserFormState = {
  error: string | null;
  success: string | null;
};

export type TeacherSubjectState = {
  error: string | null;
  success: string | null;
};

export type UserUpdateState = {
  error: string | null;
  success: string | null;
};

export type LifecycleState = {
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

export async function updateSchoolUserAction(
  _prevState: UserUpdateState,
  formData: FormData
): Promise<UserUpdateState> {
  const session = await getSession();
  if (!session) return { error: "Sesion no valida.", success: null };
  if (session.role !== "admin") {
    return { error: "Solo admin puede editar usuarios.", success: null };
  }

  const id = Number.parseInt(String(formData.get("id") ?? "").trim(), 10);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as UserRole;
  const isActive = String(formData.get("is_active") ?? "").trim() === "true";
  const newPassword = String(formData.get("new_password") ?? "").trim();
  const allowedRoles: Array<"admin" | "docente" | "director"> = [
    "admin",
    "docente",
    "director",
  ];

  if (
    !Number.isInteger(id) ||
    !fullName ||
    !allowedRoles.includes(role as "admin" | "docente" | "director")
  ) {
    return { error: "Datos invalidos para actualizar usuario.", success: null };
  }

  const profileResult = await updateSchoolUserProfile({
    id,
    full_name: fullName,
    role: role as "admin" | "docente" | "director",
    is_active: isActive,
  });
  if (profileResult.error) return { error: profileResult.error, success: null };

  if (newPassword) {
    if (newPassword.length < 8) {
      return { error: "La nueva contrasena debe tener al menos 8 caracteres.", success: null };
    }
    const hash = await hashPassword(newPassword);
    const passResult = await updateSchoolUserPassword(id, hash);
    if (passResult.error) return { error: passResult.error, success: null };
  }

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "actualizar",
    entity_id: String(id),
    after_data: {
      user_type: "school_user",
      full_name: fullName,
      role,
      is_active: isActive,
      password_updated: Boolean(newPassword),
    },
  });

  if (!isActive) {
    await deleteTeacherAssignmentsByTeacher(id);
  }

  revalidatePath("/dashboard/usuarios");
  return { error: null, success: "Usuario actualizado." };
}

export async function updateStudentAction(
  _prevState: UserUpdateState,
  formData: FormData
): Promise<UserUpdateState> {
  const session = await getSession();
  if (!session) return { error: "Sesion no valida.", success: null };
  if (session.role !== "admin") {
    return { error: "Solo admin puede editar estudiantes.", success: null };
  }

  const id = Number.parseInt(String(formData.get("id") ?? "").trim(), 10);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const course = String(formData.get("course") ?? "").trim();
  const academicStatus = String(formData.get("academic_status") ?? "").trim() as
    | "activo"
    | "graduado"
    | "retirado";
  const isActive = String(formData.get("is_active") ?? "").trim() === "true";
  const usernameRaw = String(formData.get("username") ?? "").trim();
  const username = usernameRaw || null;
  const newPassword = String(formData.get("new_password") ?? "").trim();

  if (!Number.isInteger(id) || !fullName || !course) {
    return { error: "Datos invalidos para actualizar estudiante.", success: null };
  }
  if (!["activo", "graduado", "retirado"].includes(academicStatus)) {
    return { error: "Estado academico invalido.", success: null };
  }
  if (username && !USERNAME_REGEX.test(username)) {
    return {
      error: "Usuario de estudiante invalido. Usa 4-30 caracteres permitidos.",
      success: null,
    };
  }

  const profileResult = await updateStudentProfile({
    id,
    full_name: fullName,
    course,
    academic_status: academicStatus,
    is_active: isActive,
    username,
  });
  if (profileResult.error) return { error: profileResult.error, success: null };

  if (newPassword) {
    if (newPassword.length < 8) {
      return { error: "La nueva contrasena debe tener al menos 8 caracteres.", success: null };
    }
    const hash = await hashPassword(newPassword);
    const passResult = await updateStudentPassword(id, hash);
    if (passResult.error) return { error: passResult.error, success: null };
  }

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "actualizar",
    entity_id: String(id),
    after_data: {
      user_type: "student",
      full_name: fullName,
      course,
      academic_status: academicStatus,
      is_active: isActive,
      username,
      password_updated: Boolean(newPassword),
    },
  });

  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard/calificaciones");
  return { error: null, success: "Estudiante actualizado." };
}

export async function updateParentAction(
  _prevState: UserUpdateState,
  formData: FormData
): Promise<UserUpdateState> {
  const session = await getSession();
  if (!session) return { error: "Sesion no valida.", success: null };
  if (session.role !== "admin") {
    return { error: "Solo admin puede editar padres/madres.", success: null };
  }

  const id = Number.parseInt(String(formData.get("id") ?? "").trim(), 10);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const isActive = String(formData.get("is_active") ?? "").trim() === "true";
  const newPassword = String(formData.get("new_password") ?? "").trim();

  if (!Number.isInteger(id) || !fullName || !username) {
    return { error: "Datos invalidos para actualizar padre/madre.", success: null };
  }
  if (!USERNAME_REGEX.test(username)) {
    return { error: "Usuario de padre/madre invalido.", success: null };
  }

  const profileResult = await updateParentProfile({
    id,
    full_name: fullName,
    username,
    is_active: isActive,
  });
  if (profileResult.error) return { error: profileResult.error, success: null };

  if (newPassword) {
    if (newPassword.length < 8) {
      return { error: "La nueva contrasena debe tener al menos 8 caracteres.", success: null };
    }
    const hash = await hashPassword(newPassword);
    const passResult = await updateParentPassword(id, hash);
    if (passResult.error) return { error: passResult.error, success: null };
  }

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "actualizar",
    entity_id: String(id),
    after_data: {
      user_type: "parent",
      full_name: fullName,
      username,
      is_active: isActive,
      password_updated: Boolean(newPassword),
    },
  });

  revalidatePath("/dashboard/usuarios");
  return { error: null, success: "Padre/madre actualizado." };
}

export async function promoteCourseAction(
  _prevState: LifecycleState,
  formData: FormData
): Promise<LifecycleState> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: "Solo admin puede promover cursos.", success: null };
  }

  const fromCourse = String(formData.get("from_course") ?? "").trim();
  const toCourse = String(formData.get("to_course") ?? "").trim();
  if (!fromCourse || !toCourse) {
    return { error: "Debes indicar curso origen y destino.", success: null };
  }

  const result = await promoteStudentsCourse({ fromCourse, toCourse });
  if (result.error) return { error: result.error, success: null };

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "actualizar",
    after_data: {
      action_type: "promocion_curso",
      from_course: fromCourse,
      to_course: toCourse,
      affected_rows: result.data?.length ?? 0,
    },
  });

  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard/calificaciones");
  revalidatePath("/dashboard/asistencias");
  return {
    error: null,
    success: `Promocion aplicada. Estudiantes actualizados: ${result.data?.length ?? 0}.`,
  };
}

export async function graduateCourseAction(
  _prevState: LifecycleState,
  formData: FormData
): Promise<LifecycleState> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: "Solo admin puede graduar cursos.", success: null };
  }

  const fromCourse = String(formData.get("from_course") ?? "").trim();
  const graduationYear = String(formData.get("graduation_year") ?? "").trim();
  if (!fromCourse || !graduationYear) {
    return { error: "Debes indicar curso origen y gestion de graduacion.", success: null };
  }

  const graduationCourseLabel = `Graduado ${graduationYear}`;
  const result = await graduateStudentsCourse({ fromCourse, graduationCourseLabel });
  if (result.error) return { error: result.error, success: null };

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "actualizar",
    after_data: {
      action_type: "graduacion_curso",
      from_course: fromCourse,
      graduation_course: graduationCourseLabel,
      affected_rows: result.data?.length ?? 0,
    },
  });

  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard/calificaciones");
  revalidatePath("/dashboard/asistencias");
  return {
    error: null,
    success: `Graduacion aplicada. Estudiantes actualizados: ${result.data?.length ?? 0}.`,
  };
}
