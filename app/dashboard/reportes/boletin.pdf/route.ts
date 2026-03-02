import { getSession } from "@/lib/auth";
import { listGradeRecords, listStudents, listSubjectStudentEnrollments } from "@/lib/db";
import { buildBulletinPdf } from "@/lib/bulletin-pdf";
import { qualitativePerformance } from "@/lib/grade-utils";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !["admin", "director"].includes(session.role)) {
    return new Response("No autorizado", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = Number.parseInt(searchParams.get("student_id") ?? "", 10);
  const term = (searchParams.get("term") ?? "").trim();

  if (!Number.isInteger(studentId) || !term) {
    return new Response("Debes enviar student_id y term.", { status: 400 });
  }

  const [studentsResult, gradesResult, enrollmentsResult] = await Promise.all([
    listStudents(),
    listGradeRecords({ limit: 4000 }),
    listSubjectStudentEnrollments(),
  ]);

  const setupError = studentsResult.error ?? gradesResult.error ?? enrollmentsResult.error;
  if (setupError || !studentsResult.data || !gradesResult.data || !enrollmentsResult.data) {
    return new Response(setupError ?? "No se pudo generar el boletin.", { status: 500 });
  }

  const student = studentsResult.data.find((item) => item.id === studentId) ?? null;
  if (!student) {
    return new Response("Estudiante no encontrado.", { status: 404 });
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

  const bytes = buildBulletinPdf({
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
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
