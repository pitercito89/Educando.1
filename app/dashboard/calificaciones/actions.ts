"use server";

import { revalidatePath } from "next/cache";
import {
  createAuditLog,
  createEvaluationActivity,
  createGradeRecord,
  createNotificationLog,
  createParent,
  getEvaluationActivityById,
  createSubjectStudentEnrollment,
  createStudent,
  createSubject,
  createTeacherSubjectAssignment,
  getStudentById,
  isStudentEnrolledInSubject,
  isTeacherAssignedToSubject,
  listEvaluationScoresForConsolidation,
  listParentsByStudent,
  upsertEvaluationScore,
  upsertGradeRecord,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";
import { consolidateFromEvaluationScores } from "@/lib/grade-utils";

export type GradeFormState = {
  error: string | null;
  success: string | null;
};

export type CatalogFormState = {
  error: string | null;
  success: string | null;
};

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{4,30}$/;

function parseScore(value: FormDataEntryValue | null): number {
  return Number(String(value ?? "").trim());
}

function parseId(value: FormDataEntryValue | null): number {
  return Number.parseInt(String(value ?? "").trim(), 10);
}

function isValidScore(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

async function notifyGradePublished(params: {
  studentId: number;
  studentFullName: string;
  studentChatId: string | null;
  term: string;
  saber: number;
  hacer: number;
  ser: number;
  decidir: number;
  total: number;
}) {
  const parentsResult = await listParentsByStudent(params.studentId);
  const parents = parentsResult.data ?? [];
  const message =
    `Nueva calificacion registrada.\n` +
    `Periodo: ${params.term}\n` +
    `Total: ${params.total.toFixed(2)}\n` +
    `Dimensiones: S=${params.saber}, H=${params.hacer}, Se=${params.ser}, D=${params.decidir}`;

  const studentSend = await sendTelegramMessage(params.studentChatId, message);
  await createNotificationLog({
    student_id: params.studentId,
    event_type: "calificacion_publicada",
    channel: "telegram",
    message,
    status: studentSend.ok ? "enviado" : "pendiente",
  });

  for (const parent of parents) {
    const parentSend = await sendTelegramMessage(
      parent.telegram_chat_id,
      `Notificacion para ${params.studentFullName}:\n${message}`
    );
    await createNotificationLog({
      student_id: params.studentId,
      event_type: "calificacion_publicada_padre",
      channel: "telegram",
      message: `Padre ${parent.full_name}: ${message}`,
      status: parentSend.ok ? "enviado" : "pendiente",
    });
  }
}

export async function createStudentAction(
  _prevState: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sesion no valida.", success: null };
  }
  if (session.role !== "admin") {
    return { error: "Solo admin puede registrar estudiantes.", success: null };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const course = String(formData.get("course") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const guardianChatId = String(formData.get("guardian_chat_id") ?? "").trim();
  const parentFullName = String(formData.get("parent_full_name") ?? "").trim();
  const parentUsername = String(formData.get("parent_username") ?? "").trim();
  const parentPassword = String(formData.get("parent_password") ?? "").trim();

  if (!fullName || !course || !username || !password) {
    return {
      error: "Nombre, curso, usuario y contrasena de estudiante son obligatorios.",
      success: null,
    };
  }
  if (!USERNAME_REGEX.test(username)) {
    return {
      error: "Usuario de estudiante invalido. Usa 4-30 caracteres permitidos.",
      success: null,
    };
  }
  if (password.length < 8) {
    return { error: "La contrasena del estudiante debe tener al menos 8 caracteres.", success: null };
  }
  if (parentUsername && !USERNAME_REGEX.test(parentUsername)) {
    return {
      error: "Usuario de padre/madre invalido. Usa 4-30 caracteres permitidos.",
      success: null,
    };
  }
  if (parentPassword && parentPassword.length < 8) {
    return { error: "La contrasena del padre/madre debe tener al menos 8 caracteres.", success: null };
  }

  const result = await createStudent({
    full_name: fullName,
    course,
    username,
    password,
    guardian_chat_id: guardianChatId || null,
  });

  if (result.error) {
    return { error: result.error, success: null };
  }

  const createdStudent = result.data?.[0];
  if (!createdStudent) {
    return { error: "No se pudo obtener el estudiante creado.", success: null };
  }

  if (parentFullName || parentUsername || parentPassword) {
    if (!parentFullName || !parentUsername || !parentPassword) {
      return {
        error: "Para crear padre, completa nombre, usuario y contrasena del padre.",
        success: null,
      };
    }
    const parentResult = await createParent({
      student_id: createdStudent.id,
      full_name: parentFullName,
      username: parentUsername,
      password: parentPassword,
    });
    if (parentResult.error) {
      return { error: parentResult.error, success: null };
    }
  }

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "crear",
    entity_id: String(createdStudent.id),
    after_data: {
      type: "student",
      full_name: fullName,
      course,
      username,
      parent_username: parentUsername || null,
    },
  });

  revalidatePath("/dashboard/calificaciones");
  return { error: null, success: "Estudiante registrado." };
}

export async function createSubjectAction(
  _prevState: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sesion no valida.", success: null };
  }
  if (session.role !== "admin") {
    return { error: "Solo admin puede registrar materias.", success: null };
  }

  const name = String(formData.get("name") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();

  if (!name || !level) {
    return { error: "Materia y nivel son obligatorios.", success: null };
  }
  if (name.length < 2 || level.length < 2) {
    return { error: "Materia y nivel deben ser descriptivos.", success: null };
  }

  const result = await createSubject({ name, level });

  if (result.error) {
    return { error: result.error, success: null };
  }

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "crear",
    entity_id: result.data?.[0] ? String(result.data[0].id) : null,
    after_data: { type: "subject", name, level },
  });

  revalidatePath("/dashboard/calificaciones");
  return { error: null, success: "Materia registrada." };
}

export async function assignTeacherToSubjectAction(
  _prevState: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const session = await getSession();
  if (!session) return { error: "Sesion no valida.", success: null };
  if (session.role !== "admin") {
    return { error: "Solo admin puede asignar docentes a materias.", success: null };
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
  if (result.error) return { error: result.error, success: null };

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "actualizar",
    entity_id: result.data?.[0] ? String(result.data[0].id) : null,
    after_data: { teacher_user_id: teacherUserId, subject_id: subjectId },
  });

  revalidatePath("/dashboard/calificaciones");
  return { error: null, success: "Docente asignado a materia correctamente." };
}

export async function enrollStudentInSubjectAction(
  _prevState: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const session = await getSession();
  if (!session) return { error: "Sesion no valida.", success: null };
  if (session.role !== "admin") {
    return { error: "Solo admin puede asignar estudiantes a materias.", success: null };
  }

  const studentId = parseId(formData.get("student_id"));
  const subjectId = parseId(formData.get("subject_id"));
  if (!Number.isInteger(studentId) || !Number.isInteger(subjectId)) {
    return { error: "Estudiante y materia son obligatorios.", success: null };
  }

  const result = await createSubjectStudentEnrollment({
    student_id: studentId,
    subject_id: subjectId,
  });
  if (result.error) return { error: result.error, success: null };

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "usuarios",
    action: "actualizar",
    entity_id: result.data?.[0] ? String(result.data[0].id) : null,
    after_data: { student_id: studentId, subject_id: subjectId },
  });

  revalidatePath("/dashboard/calificaciones");
  revalidatePath("/dashboard/asistencias");
  return { error: null, success: "Estudiante asignado a materia correctamente." };
}

export async function createGradeAction(
  _prevState: GradeFormState,
  formData: FormData
): Promise<GradeFormState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sesion no valida.", success: null };
  }
  if (session.role !== "admin" && session.role !== "docente") {
    return { error: "Solo admin/docente puede registrar calificaciones.", success: null };
  }

  const studentId = parseId(formData.get("student_id"));
  const subjectId = parseId(formData.get("subject_id"));
  const selectedCourse = String(formData.get("course_filter") ?? "").trim();
  const term = String(formData.get("term") ?? "").trim();

  const saber = parseScore(formData.get("saber"));
  const hacer = parseScore(formData.get("hacer"));
  const ser = parseScore(formData.get("ser"));
  const decidir = parseScore(formData.get("decidir"));

  if (!selectedCourse) {
    return { error: "Primero debes seleccionar un curso.", success: null };
  }

  if (!Number.isInteger(studentId) || !Number.isInteger(subjectId) || !term) {
    return { error: "Curso, estudiante, materia y periodo son obligatorios.", success: null };
  }

  const studentResult = await getStudentById(studentId);
  if (studentResult.error || !studentResult.data) {
    return { error: "No se encontro el estudiante seleccionado.", success: null };
  }
  if (studentResult.data.course !== selectedCourse) {
    return {
      error: "El estudiante no pertenece al curso seleccionado.",
      success: null,
    };
  }

  const enrollmentResult = await isStudentEnrolledInSubject({
    student_id: studentId,
    subject_id: subjectId,
  });
  if (enrollmentResult.error) {
    return { error: enrollmentResult.error, success: null };
  }
  if (!enrollmentResult.data) {
    return {
      error: "El estudiante no esta asignado a esta materia.",
      success: null,
    };
  }

  if (session.role === "docente") {
    if (!session.schoolUserId) {
      return { error: "Cuenta docente sin identificador valido.", success: null };
    }
    const assignment = await isTeacherAssignedToSubject({
      teacher_user_id: session.schoolUserId,
      subject_id: subjectId,
    });
    if (assignment.error) {
      return { error: assignment.error, success: null };
    }
    if (!assignment.data) {
      return {
        error: "No tienes permiso para calificar esta materia.",
        success: null,
      };
    }
  }

  if (![saber, hacer, ser, decidir].every(isValidScore)) {
    return { error: "Las notas deben estar entre 0 y 100.", success: null };
  }

  const total = Number((saber * 0.35 + hacer * 0.35 + ser * 0.15 + decidir * 0.15).toFixed(2));

  const result = await createGradeRecord({
    student_id: studentId,
    subject_id: subjectId,
    term,
    saber,
    hacer,
    ser,
    decidir,
    total,
  });

  if (result.error) {
    return { error: result.error, success: null };
  }

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "calificaciones",
    action: "crear",
    entity_id: result.data?.[0] ? String(result.data[0].id) : null,
    after_data: {
      student_id: studentId,
      subject_id: subjectId,
      term,
      saber,
      hacer,
      ser,
      decidir,
      total,
    },
  });

  const student = studentResult.data;

  if (student) {
    await notifyGradePublished({
      studentId: student.id,
      studentFullName: student.full_name,
      studentChatId: student.telegram_chat_id,
      term,
      saber,
      hacer,
      ser,
      decidir,
      total,
    });
  }

  revalidatePath("/dashboard/calificaciones");
  revalidatePath("/dashboard/notificaciones");
  return { error: null, success: "Calificacion registrada." };
}

export async function createEvaluationActivityAction(
  _prevState: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const session = await getSession();
  if (!session) return { error: "Sesion no valida.", success: null };
  if (session.role !== "admin" && session.role !== "docente") {
    return { error: "Solo admin/docente puede crear actividades.", success: null };
  }

  const subjectId = parseId(formData.get("subject_id"));
  const course = String(formData.get("course") ?? "").trim();
  const term = String(formData.get("term") ?? "").trim();
  const dimension = String(formData.get("dimension") ?? "").trim();
  const instrumentType = String(formData.get("instrument_type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const weight = Number(String(formData.get("weight") ?? "").trim());

  const validDimensions = new Set(["ser", "saber", "hacer", "decidir"]);
  const validTypes = new Set([
    "examen",
    "practico",
    "tarea",
    "proyecto",
    "participacion",
    "otro",
  ]);

  if (
    !Number.isInteger(subjectId) ||
    !course ||
    !term ||
    !title ||
    !validDimensions.has(dimension) ||
    !validTypes.has(instrumentType) ||
    !Number.isFinite(weight) ||
    weight <= 0 ||
    weight > 100
  ) {
    return {
      error:
        "Completa materia, curso, periodo, titulo, dimension, tipo de instrumento y peso valido (0-100).",
      success: null,
    };
  }

  if (session.role === "docente") {
    if (!session.schoolUserId) {
      return { error: "Cuenta docente sin identificador valido.", success: null };
    }
    const assignment = await isTeacherAssignedToSubject({
      teacher_user_id: session.schoolUserId,
      subject_id: subjectId,
    });
    if (assignment.error) return { error: assignment.error, success: null };
    if (!assignment.data) {
      return { error: "No tienes permiso para crear actividades en esta materia.", success: null };
    }
  }

  const result = await createEvaluationActivity({
    subject_id: subjectId,
    course,
    term,
    dimension: dimension as "ser" | "saber" | "hacer" | "decidir",
    instrument_type: instrumentType as
      | "examen"
      | "practico"
      | "tarea"
      | "proyecto"
      | "participacion"
      | "otro",
    title,
    weight,
    created_by_user_id: session.schoolUserId ?? null,
  });

  if (result.error) return { error: result.error, success: null };

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "calificaciones",
    action: "crear",
    entity_id: result.data?.[0] ? String(result.data[0].id) : null,
    after_data: {
      subject_id: subjectId,
      course,
      term,
      dimension,
      instrument_type: instrumentType,
      title,
      weight,
    },
  });

  revalidatePath("/dashboard/calificaciones");
  return { error: null, success: "Actividad evaluativa creada." };
}

export async function registerEvaluationScoreAction(
  _prevState: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const session = await getSession();
  if (!session) return { error: "Sesion no valida.", success: null };
  if (session.role !== "admin" && session.role !== "docente") {
    return { error: "Solo admin/docente puede cargar notas.", success: null };
  }

  const activityId = parseId(formData.get("activity_id"));
  const studentId = parseId(formData.get("student_id"));
  const score = parseScore(formData.get("score"));

  if (!Number.isInteger(activityId) || !Number.isInteger(studentId) || !isValidScore(score)) {
    return { error: "Actividad, estudiante y nota valida son obligatorios.", success: null };
  }

  const activityResult = await getEvaluationActivityById(activityId);
  if (activityResult.error || !activityResult.data) {
    return { error: activityResult.error ?? "No se encontro la actividad.", success: null };
  }

  const activity = activityResult.data;
  const studentResult = await getStudentById(studentId);
  if (studentResult.error || !studentResult.data) {
    return { error: "No se encontro el estudiante seleccionado.", success: null };
  }

  const student = studentResult.data;
  if (student.course !== activity.course) {
    return { error: "El estudiante no pertenece al curso de esta actividad.", success: null };
  }

  const enrollmentResult = await isStudentEnrolledInSubject({
    student_id: studentId,
    subject_id: activity.subject_id,
  });
  if (enrollmentResult.error) return { error: enrollmentResult.error, success: null };
  if (!enrollmentResult.data) {
    return { error: "El estudiante no esta inscrito en la materia de la actividad.", success: null };
  }

  if (session.role === "docente") {
    if (!session.schoolUserId) {
      return { error: "Cuenta docente sin identificador valido.", success: null };
    }
    const assignment = await isTeacherAssignedToSubject({
      teacher_user_id: session.schoolUserId,
      subject_id: activity.subject_id,
    });
    if (assignment.error) return { error: assignment.error, success: null };
    if (!assignment.data) {
      return { error: "No tienes permiso para cargar notas en esta materia.", success: null };
    }
  }

  const result = await upsertEvaluationScore({
    activity_id: activityId,
    student_id: studentId,
    score,
  });
  if (result.error) return { error: result.error, success: null };

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "calificaciones",
    action: "actualizar",
    entity_id: result.data?.[0] ? String(result.data[0].id) : null,
    after_data: {
      activity_id: activityId,
      student_id: studentId,
      score,
    },
  });

  revalidatePath("/dashboard/calificaciones");
  return { error: null, success: "Nota por instrumento registrada." };
}

export async function bulkRegisterEvaluationScoresAction(
  _prevState: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const session = await getSession();
  if (!session) return { error: "Sesion no valida.", success: null };
  if (session.role !== "admin" && session.role !== "docente") {
    return { error: "Solo admin/docente puede cargar notas masivas.", success: null };
  }

  const activityId = parseId(formData.get("activity_id"));
  if (!Number.isInteger(activityId)) {
    return { error: "Selecciona una actividad evaluativa.", success: null };
  }

  const activityResult = await getEvaluationActivityById(activityId);
  if (activityResult.error || !activityResult.data) {
    return { error: activityResult.error ?? "No se encontro la actividad.", success: null };
  }
  const activity = activityResult.data;

  if (session.role === "docente") {
    if (!session.schoolUserId) {
      return { error: "Cuenta docente sin identificador valido.", success: null };
    }
    const assignment = await isTeacherAssignedToSubject({
      teacher_user_id: session.schoolUserId,
      subject_id: activity.subject_id,
    });
    if (assignment.error) return { error: assignment.error, success: null };
    if (!assignment.data) {
      return { error: "No tienes permiso para esta materia.", success: null };
    }
  }

  const payload: Array<{ student_id: number; score: number }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score_")) continue;
    const studentId = Number.parseInt(key.replace("score_", ""), 10);
    const raw = String(value ?? "").trim();
    if (!raw) continue;
    const score = Number(raw);
    if (!Number.isInteger(studentId) || !isValidScore(score)) {
      return { error: "Todas las notas deben estar entre 0 y 100.", success: null };
    }
    payload.push({ student_id: studentId, score });
  }

  if (payload.length === 0) {
    return { error: "Ingresa al menos una nota para guardar.", success: null };
  }

  for (const item of payload) {
    const studentResult = await getStudentById(item.student_id);
    if (studentResult.error || !studentResult.data) {
      return { error: "Se detecto un estudiante invalido en la planilla.", success: null };
    }
    if (studentResult.data.course !== activity.course) {
      return {
        error: `El estudiante ${studentResult.data.full_name} no pertenece al curso de la actividad.`,
        success: null,
      };
    }
    const enrollmentResult = await isStudentEnrolledInSubject({
      student_id: item.student_id,
      subject_id: activity.subject_id,
    });
    if (enrollmentResult.error) return { error: enrollmentResult.error, success: null };
    if (!enrollmentResult.data) {
      return {
        error: `El estudiante ${studentResult.data.full_name} no esta inscrito en la materia.`,
        success: null,
      };
    }

    const save = await upsertEvaluationScore({
      activity_id: activityId,
      student_id: item.student_id,
      score: item.score,
    });
    if (save.error) return { error: save.error, success: null };
  }

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "calificaciones",
    action: "actualizar",
    entity_id: String(activityId),
    after_data: {
      mode: "bulk_planilla",
      registros: payload.length,
    },
  });

  revalidatePath("/dashboard/calificaciones");
  return {
    error: null,
    success: `Planilla guardada. Registros actualizados: ${payload.length}.`,
  };
}

export async function consolidateTrimestralGradeAction(
  _prevState: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const session = await getSession();
  if (!session) return { error: "Sesion no valida.", success: null };
  if (session.role !== "admin" && session.role !== "docente") {
    return { error: "Solo admin/docente puede consolidar calificaciones.", success: null };
  }

  const studentId = parseId(formData.get("student_id"));
  const subjectId = parseId(formData.get("subject_id"));
  const term = String(formData.get("term") ?? "").trim();

  if (!Number.isInteger(studentId) || !Number.isInteger(subjectId) || !term) {
    return { error: "Estudiante, materia y periodo son obligatorios.", success: null };
  }

  if (session.role === "docente") {
    if (!session.schoolUserId) {
      return { error: "Cuenta docente sin identificador valido.", success: null };
    }
    const assignment = await isTeacherAssignedToSubject({
      teacher_user_id: session.schoolUserId,
      subject_id: subjectId,
    });
    if (assignment.error) return { error: assignment.error, success: null };
    if (!assignment.data) {
      return { error: "No tienes permiso para consolidar esta materia.", success: null };
    }
  }

  const enrollmentResult = await isStudentEnrolledInSubject({
    student_id: studentId,
    subject_id: subjectId,
  });
  if (enrollmentResult.error) return { error: enrollmentResult.error, success: null };
  if (!enrollmentResult.data) {
    return { error: "El estudiante no esta inscrito en esta materia.", success: null };
  }

  const scoresResult = await listEvaluationScoresForConsolidation({
    student_id: studentId,
    subject_id: subjectId,
    term,
  });
  if (scoresResult.error) return { error: scoresResult.error, success: null };

  const rows = scoresResult.data ?? [];
  if (rows.length === 0) {
    return { error: "No hay evaluaciones registradas para consolidar en ese periodo.", success: null };
  }

  const consolidation = consolidateFromEvaluationScores(rows);
  if (!consolidation.result) {
    return {
      error: `Faltan evaluaciones en dimensiones: ${consolidation.missingDimensions.join(", ")}.`,
      success: null,
    };
  }

  const { saber, hacer, ser, decidir, total } = consolidation.result;

  const saveResult = await upsertGradeRecord({
    student_id: studentId,
    subject_id: subjectId,
    term,
    saber,
    hacer,
    ser,
    decidir,
    total,
  });
  if (saveResult.error) return { error: saveResult.error, success: null };

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "calificaciones",
    action: "consolidar",
    entity_id: saveResult.data?.[0] ? String(saveResult.data[0].id) : null,
    after_data: {
      student_id: studentId,
      subject_id: subjectId,
      term,
      saber,
      hacer,
      ser,
      decidir,
      total,
    },
  });

  const studentResult = await getStudentById(studentId);
  if (studentResult.data) {
    await notifyGradePublished({
      studentId: studentResult.data.id,
      studentFullName: studentResult.data.full_name,
      studentChatId: studentResult.data.telegram_chat_id,
      term,
      saber,
      hacer,
      ser,
      decidir,
      total,
    });
  }

  revalidatePath("/dashboard/calificaciones");
  revalidatePath("/dashboard/notificaciones");
  revalidatePath("/dashboard/reportes");
  return { error: null, success: "Calificacion trimestral consolidada correctamente." };
}
