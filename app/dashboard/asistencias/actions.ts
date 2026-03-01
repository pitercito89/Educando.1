"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  createAuditLog,
  createNotificationLog,
  getStudentById,
  isTeacherAllowedForStudent,
  listParentsByStudent,
  type AttendanceStatus,
  upsertAttendanceRecord,
} from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";

export type AttendanceFormState = {
  error: string | null;
  success: string | null;
};
const VALID_STATUS: AttendanceStatus[] = [
  "presente",
  "licencia",
  "falta",
];

async function notifyAttendanceIncident(
  studentId: number,
  status: AttendanceStatus,
  attendanceDate: string
): Promise<void> {
  if (status !== "falta") return;

  const studentResult = await getStudentById(studentId);
  const parentsResult = await listParentsByStudent(studentId);
  const student = studentResult.data;
  const parents = parentsResult.data ?? [];

  const message = `Incidencia de asistencia: ${status} (${attendanceDate}).`;

  if (student) {
    const studentSend = await sendTelegramMessage(
      student.telegram_chat_id,
      `${student.full_name}: ${message}`
    );
    await createNotificationLog({
      student_id: studentId,
      event_type: "alerta_asistencia_estudiante",
      channel: "telegram",
      message: `${student.full_name}: ${message}`,
      status: studentSend.ok ? "enviado" : "pendiente",
    });
  }

  for (const parent of parents) {
    const parentSend = await sendTelegramMessage(
      parent.telegram_chat_id,
      `Alerta para ${student?.full_name ?? "estudiante"}: ${message}`
    );
    await createNotificationLog({
      student_id: studentId,
      event_type: "alerta_asistencia_padre",
      channel: "telegram",
      message: `Padre ${parent.full_name}: ${message}`,
      status: parentSend.ok ? "enviado" : "pendiente",
    });
  }
}

export async function saveCourseAttendanceAction(
  _prevState: AttendanceFormState,
  formData: FormData
): Promise<AttendanceFormState> {
  const session = await getSession();
  if (!session) return { error: "Sesion no valida.", success: null };
  if (session.role !== "admin" && session.role !== "docente") {
    return { error: "Solo admin/docente puede registrar asistencias.", success: null };
  }

  const attendanceDate = String(formData.get("attendance_date") ?? "").trim();
  const studentIdsRaw = String(formData.get("student_ids") ?? "").trim();
  const studentIds = studentIdsRaw
    .split(",")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value));

  if (!attendanceDate || studentIds.length === 0) {
    return { error: "Debes seleccionar curso y fecha validos.", success: null };
  }

  for (const studentId of studentIds) {
    const status = String(formData.get(`status_${studentId}`) ?? "").trim() as AttendanceStatus;
    if (!VALID_STATUS.includes(status)) {
      return {
        error: `Estado invalido para estudiante ${studentId}.`,
        success: null,
      };
    }

    if (session.role === "docente") {
      if (!session.schoolUserId) {
        return { error: "Cuenta docente sin identificador valido.", success: null };
      }
      const allowed = await isTeacherAllowedForStudent({
        teacher_user_id: session.schoolUserId,
        student_id: studentId,
      });
      if (allowed.error) return { error: allowed.error, success: null };
      if (!allowed.data) {
        return {
          error: "No puedes registrar asistencia de estudiantes fuera de tus materias.",
          success: null,
        };
      }
    }

    const saveResult = await upsertAttendanceRecord({
      student_id: studentId,
      attendance_date: attendanceDate,
      status,
    });
    if (saveResult.error) {
      return { error: saveResult.error, success: null };
    }

    await createAuditLog({
      actor_role: session.role,
      actor_username: session.username,
      actor_user_id: session.schoolUserId ?? null,
      entity: "asistencias",
      action: "actualizar",
      entity_id: `${studentId}:${attendanceDate}`,
      after_data: {
        student_id: studentId,
        attendance_date: attendanceDate,
        status,
      },
    });

    await notifyAttendanceIncident(studentId, status, attendanceDate);
  }

  revalidatePath("/dashboard/asistencias");
  revalidatePath("/dashboard/notificaciones");
  revalidatePath("/dashboard/reportes");
  revalidatePath("/dashboard");
  return { error: null, success: "Asistencia del curso registrada correctamente." };
}
