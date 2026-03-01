"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  createAuditLog,
  createNotificationLog,
  getStudentById,
  listParents,
  listParentsByStudent,
  listStudentsBySubjectIds,
  listSubjectsByTeacherUserId,
  type NotificationChannel,
  type NotificationStatus,
} from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";

export type NotificationFormState = {
  error: string | null;
  success: string | null;
};

export type ParentMeetingState = {
  error: string | null;
  success: string | null;
};

const CHANNELS: NotificationChannel[] = ["telegram", "interno"];
const STATUSES: NotificationStatus[] = ["enviado", "pendiente", "error"];
const TEACHER_EVENT_TYPES = new Set([
  "reunion_curso",
  "conducta",
  "tarea",
  "recordatorio",
]);

function parseId(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) ? id : null;
}

export async function sendNotificationAction(
  _prevState: NotificationFormState,
  formData: FormData
): Promise<NotificationFormState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sesion no valida.", success: null };
  }
  if (!["admin", "director", "docente"].includes(session.role)) {
    return { error: "No tienes permiso para registrar envios.", success: null };
  }

  const studentId = parseId(formData.get("student_id"));
  const eventType = String(formData.get("event_type") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim() as NotificationChannel;
  const message = String(formData.get("message") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as NotificationStatus;

  if (!eventType || !channel || !message || !status) {
    return { error: "Evento, canal, estado y mensaje son obligatorios.", success: null };
  }
  if (message.length < 5 || message.length > 1000) {
    return { error: "El mensaje debe tener entre 5 y 1000 caracteres.", success: null };
  }

  if (!CHANNELS.includes(channel) || !STATUSES.includes(status)) {
    return { error: "Canal o estado no permitido.", success: null };
  }

  if (session.role === "docente") {
    if (!session.schoolUserId) {
      return { error: "Docente sin identificador de cuenta.", success: null };
    }
    if (!TEACHER_EVENT_TYPES.has(eventType)) {
      return {
        error: "Docente solo puede usar: reunion_curso, conducta, tarea o recordatorio.",
        success: null,
      };
    }
    if (!studentId) {
      return {
        error: "Docente no puede hacer envios globales. Selecciona un estudiante de su curso.",
        success: null,
      };
    }

    const teacherSubjects = await listSubjectsByTeacherUserId(session.schoolUserId);
    if (teacherSubjects.error || !teacherSubjects.data) {
      return { error: teacherSubjects.error ?? "No se pudo validar materias del docente.", success: null };
    }

    const allowedStudents = await listStudentsBySubjectIds(
      teacherSubjects.data.map((item) => item.id)
    );
    if (allowedStudents.error || !allowedStudents.data) {
      return { error: allowedStudents.error ?? "No se pudo validar estudiantes del docente.", success: null };
    }

    const allowedIds = new Set(allowedStudents.data.map((item) => item.id));
    if (!allowedIds.has(studentId)) {
      return {
        error: "No puedes notificar estudiantes fuera de tus materias/cursos.",
        success: null,
      };
    }
  }

  let finalStatus = status;
  if (channel === "telegram" && studentId) {
    const studentResult = await getStudentById(studentId);
    const parentsResult = await listParentsByStudent(studentId);
    const student = studentResult.data;
    const parents = parentsResult.data ?? [];
    let delivered = false;

    if (student) {
      const sentStudent = await sendTelegramMessage(student.telegram_chat_id, message);
      delivered = delivered || sentStudent.ok;
    }

    for (const parent of parents) {
      const sentParent = await sendTelegramMessage(
        parent.telegram_chat_id,
        `Aviso para ${student?.full_name ?? "estudiante"}:\n${message}`
      );
      delivered = delivered || sentParent.ok;
    }

    finalStatus = delivered ? "enviado" : "pendiente";
  }

  const result = await createNotificationLog({
    student_id: studentId,
    event_type: eventType,
    channel,
    message,
    status: finalStatus,
  });

  if (result.error) {
    return { error: result.error, success: null };
  }

  await createAuditLog({
    actor_role: session.role,
    actor_username: session.username,
    actor_user_id: session.schoolUserId ?? null,
    entity: "notificaciones",
    action: "enviar",
    entity_id: result.data?.[0] ? String(result.data[0].id) : null,
    after_data: {
      student_id: studentId,
      event_type: eventType,
      channel,
      status: finalStatus,
    },
  });

  revalidatePath("/dashboard/notificaciones");
  revalidatePath("/dashboard");
  return { error: null, success: "Notificacion registrada en auditoria." };
}

export async function sendMeetingToParentsAction(
  _prevState: ParentMeetingState,
  formData: FormData
): Promise<ParentMeetingState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sesion no valida.", success: null };
  }
  if (!["admin", "director", "docente"].includes(session.role)) {
    return { error: "No tienes permiso para este envio.", success: null };
  }

  const meetingTitle = String(formData.get("meeting_title") ?? "").trim();
  const meetingDate = String(formData.get("meeting_date") ?? "").trim();
  const meetingTime = String(formData.get("meeting_time") ?? "").trim();
  const course = String(formData.get("course") ?? "").trim();
  const extraMessage = String(formData.get("extra_message") ?? "").trim();

  if (!meetingTitle || !meetingDate || !meetingTime) {
    return { error: "Titulo, fecha y hora son obligatorios.", success: null };
  }
  if (meetingTitle.length < 4 || meetingTitle.length > 120) {
    return { error: "Titulo de reunion invalido (4-120 caracteres).", success: null };
  }
  if (extraMessage.length > 1000) {
    return { error: "El detalle adicional excede 1000 caracteres.", success: null };
  }

  if (course === "__select__") {
    return { error: "Selecciona un curso valido.", success: null };
  }

  const parentsResult = await listParents();
  if (parentsResult.error || !parentsResult.data) {
    return { error: parentsResult.error ?? "No se pudo cargar padres.", success: null };
  }

  const targets = parentsResult.data.filter((parent) =>
    course ? parent.student?.course === course : true
  );

  if (session.role === "docente") {
    if (!session.schoolUserId) {
      return { error: "Docente sin identificador de cuenta.", success: null };
    }
    if (!course) {
      return { error: "Docente debe seleccionar un curso especifico.", success: null };
    }

    const teacherSubjects = await listSubjectsByTeacherUserId(session.schoolUserId);
    if (teacherSubjects.error || !teacherSubjects.data) {
      return { error: teacherSubjects.error ?? "No se pudo validar materias del docente.", success: null };
    }
    const allowedStudents = await listStudentsBySubjectIds(
      teacherSubjects.data.map((item) => item.id)
    );
    if (allowedStudents.error || !allowedStudents.data) {
      return { error: allowedStudents.error ?? "No se pudo validar estudiantes del docente.", success: null };
    }

    const allowedByTeacher = new Set(allowedStudents.data.map((item) => item.id));
    const scopedTargets = targets.filter((parent) => allowedByTeacher.has(parent.student_id));

    if (scopedTargets.length === 0) {
      return {
        error: "No tienes padres disponibles en el curso seleccionado para tus materias.",
        success: null,
      };
    }

    let sentCount = 0;
    let pendingCount = 0;
    for (const parent of scopedTargets) {
      const message =
        `Reunion de padres\n` +
        `Titulo: ${meetingTitle}\n` +
        `Fecha: ${meetingDate}\n` +
        `Hora: ${meetingTime}\n` +
        `Curso: ${parent.student?.course ?? "-"}\n` +
        (extraMessage ? `Detalle: ${extraMessage}` : "");

      const sendResult = await sendTelegramMessage(parent.telegram_chat_id, message);
      const logStatus: NotificationStatus = sendResult.ok ? "enviado" : "pendiente";
      if (sendResult.ok) sentCount += 1;
      else pendingCount += 1;

      await createNotificationLog({
        student_id: parent.student_id,
        event_type: "reunion_padres",
        channel: "telegram",
        message: `Padre ${parent.full_name}: ${message}`,
        status: logStatus,
      });
      await createAuditLog({
        actor_role: session.role,
        actor_username: session.username,
        actor_user_id: session.schoolUserId ?? null,
        entity: "notificaciones",
        action: "enviar",
        entity_id: String(parent.student_id),
        after_data: {
          event_type: "reunion_padres",
          course: parent.student?.course ?? null,
          status: logStatus,
        },
      });
    }

    revalidatePath("/dashboard/notificaciones");
    revalidatePath("/dashboard");
    return {
      error: null,
      success: `Envio completado (curso ${course}). Enviadas: ${sentCount}. Pendientes: ${pendingCount}.`,
    };
  }

  if (targets.length === 0) {
    return { error: "No hay padres para el filtro seleccionado.", success: null };
  }

  let sentCount = 0;
  let pendingCount = 0;
  const scope = course ? `curso ${course}` : "todos los cursos";

  for (const parent of targets) {
    const message =
      `Reunion de padres\n` +
      `Titulo: ${meetingTitle}\n` +
      `Fecha: ${meetingDate}\n` +
      `Hora: ${meetingTime}\n` +
      `Curso: ${parent.student?.course ?? "-"}\n` +
      (extraMessage ? `Detalle: ${extraMessage}` : "");

    const sendResult = await sendTelegramMessage(parent.telegram_chat_id, message);
    const status: NotificationStatus = sendResult.ok ? "enviado" : "pendiente";
    if (sendResult.ok) {
      sentCount += 1;
    } else {
      pendingCount += 1;
    }

    await createNotificationLog({
      student_id: parent.student_id,
      event_type: "reunion_padres",
      channel: "telegram",
      message: `Padre ${parent.full_name}: ${message}`,
      status,
    });
    await createAuditLog({
      actor_role: session.role,
      actor_username: session.username,
      actor_user_id: session.schoolUserId ?? null,
      entity: "notificaciones",
      action: "enviar",
      entity_id: String(parent.student_id),
      after_data: {
        event_type: "reunion_padres",
        course: parent.student?.course ?? null,
        status,
      },
    });
  }

  revalidatePath("/dashboard/notificaciones");
  revalidatePath("/dashboard");
  return {
    error: null,
    success: `Envio completado (${scope}). Enviadas: ${sentCount}. Pendientes: ${pendingCount}.`,
  };
}
