import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  createNotificationLog,
  listGradeRecords,
  listParentsByStudent,
  listStudents,
  listSubjectStudentEnrollments,
} from "@/lib/db";
import { buildBulletinPdf } from "@/lib/bulletin-pdf";
import { qualitativePerformance } from "@/lib/grade-utils";
import { sendTelegramDocument } from "@/lib/telegram";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["admin", "director"].includes(session.role)) {
    redirect("/login");
  }

  const formData = await request.formData();
  const studentId = Number.parseInt(String(formData.get("student_id") ?? ""), 10);
  const term = String(formData.get("term") ?? "").trim();
  const course = String(formData.get("course") ?? "").trim();

  const backUrl = new URL("/dashboard/reportes/boletin", request.url);
  if (course) backUrl.searchParams.set("course", course);
  if (Number.isInteger(studentId)) backUrl.searchParams.set("student_id", String(studentId));
  if (term) backUrl.searchParams.set("term", term);

  if (!Number.isInteger(studentId) || !term) {
    backUrl.searchParams.set("send_error", "Selecciona estudiante y periodo para enviar.");
    redirect(backUrl.toString());
  }

  const [studentsResult, gradesResult, enrollmentsResult, parentsResult] = await Promise.all([
    listStudents(),
    listGradeRecords({ limit: 4000 }),
    listSubjectStudentEnrollments(),
    listParentsByStudent(studentId),
  ]);

  const setupError =
    studentsResult.error ?? gradesResult.error ?? enrollmentsResult.error ?? parentsResult.error;
  if (
    setupError ||
    !studentsResult.data ||
    !gradesResult.data ||
    !enrollmentsResult.data ||
    !parentsResult.data
  ) {
    backUrl.searchParams.set("send_error", setupError ?? "No se pudo preparar el boletin.");
    redirect(backUrl.toString());
  }

  const student = studentsResult.data.find((item) => item.id === studentId) ?? null;
  if (!student) {
    backUrl.searchParams.set("send_error", "Estudiante no encontrado.");
    redirect(backUrl.toString());
  }

  const bulletinRows = gradesResult.data.filter(
    (item) => item.student_id === studentId && item.term === term
  );
  const enrolledSubjects = enrollmentsResult.data
    .filter((item) => item.student_id === studentId)
    .map((item) => item.subject)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const pendingSubjects = enrolledSubjects.filter(
    (subject) => !bulletinRows.some((row) => row.subject.id === subject.id)
  );
  const average =
    bulletinRows.length > 0
      ? bulletinRows.reduce((acc, row) => acc + row.total, 0) / bulletinRows.length
      : 0;

  const pdfBytes = buildBulletinPdf({
    studentName: student.full_name,
    course: student.course,
    term,
    average,
    globalPerformance: qualitativePerformance(average),
    rows: bulletinRows.map((row) => ({
      subject: row.subject.name,
      saber: row.saber,
      hacer: row.hacer,
      ser: row.ser,
      decidir: row.decidir,
      total: row.total,
      performance: qualitativePerformance(row.total),
    })),
    pendingSubjects: pendingSubjects.map((subject) => subject.name),
  });

  const filename = `boletin_${student.full_name.replaceAll(" ", "_")}_${term.replaceAll(" ", "_")}.pdf`;
  const linkedParents = parentsResult.data.filter((parent) => Boolean(parent.telegram_chat_id));
  if (linkedParents.length === 0) {
    backUrl.searchParams.set("send_error", "No hay padres vinculados a Telegram para este estudiante.");
    redirect(backUrl.toString());
  }

  let sent = 0;
  const errors: string[] = [];
  for (const parent of linkedParents) {
    const response = await sendTelegramDocument(
      parent.telegram_chat_id,
      filename,
      pdfBytes,
      `Boletin ${term} de ${student.full_name}`
    );

    await createNotificationLog({
      student_id: student.id,
      event_type: "boletin_trimestral_pdf",
      channel: "telegram",
      message: response.ok
        ? `Boletin enviado a ${parent.full_name}`
        : `Error al enviar boletin a ${parent.full_name}: ${response.error ?? "desconocido"}`,
      status: response.ok ? "enviado" : "error",
    });

    if (response.ok) {
      sent += 1;
    } else {
      errors.push(`${parent.full_name}: ${response.error ?? "Error desconocido"}`);
    }
  }

  if (sent > 0) {
    backUrl.searchParams.set("send_ok", `PDF enviado a ${sent} padre(s)/madre(s).`);
  }
  if (errors.length > 0) {
    backUrl.searchParams.set("send_error", errors.slice(0, 2).join(" | "));
  }
  redirect(backUrl.toString());
}
