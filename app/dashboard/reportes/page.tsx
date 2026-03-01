import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  listAttendanceRecords,
  listGradeRecords,
  listNotificationLogs,
  listStudents,
} from "@/lib/db";

export default async function ReportesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["admin", "director"].includes(session.role)) redirect("/dashboard");
  const [gradesResult, attendanceResult, notificationsResult, studentsResult] = await Promise.all([
    listGradeRecords(),
    listAttendanceRecords({ limit: 200 }),
    listNotificationLogs(100),
    listStudents(),
  ]);

  const setupError =
    gradesResult.error ?? attendanceResult.error ?? notificationsResult.error ?? studentsResult.error;

  const grades = gradesResult.data ?? [];
  const attendance = attendanceResult.data ?? [];
  const notifications = notificationsResult.data ?? [];
  const students = studentsResult.data ?? [];

  const courses = new Map<string, { students: Set<string>; grades: number }>();
  for (const row of grades) {
    const key = row.student.course;
    const current = courses.get(key) ?? { students: new Set<string>(), grades: 0 };
    current.students.add(row.student.full_name);
    current.grades += 1;
    courses.set(key, current);
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#eef6ff_0%,#f7fbff_45%,#f3f8ff_100%)] p-4 md:p-8">
      <main className="mx-auto max-w-5xl rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_-36px_rgba(23,66,130,0.65)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Analitica Escolar</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Modulo: Reportes</h1>
        <p className="mt-2 text-gray-700">
          Reportes operativos para seguimiento academico y exportaciones compatibles con Excel.
        </p>

        <section className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <article className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Registros de calificacion</p>
            <p className="text-2xl font-bold text-blue-700">{grades.length}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Registros de asistencia</p>
            <p className="text-2xl font-bold text-green-700">{attendance.length}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Notificaciones auditadas</p>
            <p className="text-2xl font-bold text-purple-700">{notifications.length}</p>
          </article>
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Exportaciones</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
              <p className="mt-1">Ejecuta `database/schema.sql` para habilitar reportes.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <a
                href="/dashboard/reportes/grades.csv"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Descargar calificaciones (CSV)
              </a>
              <a
                href="/dashboard/reportes/asistencias.csv"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Descargar asistencias (CSV)
              </a>
              <Link
                href="/dashboard/reportes/boletin"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Generar boletin trimestral
              </Link>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Boletin trimestral</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-gray-600">No hay estudiantes registrados para generar boletines.</p>
          ) : (
            <p className="text-sm text-gray-700">
              Genera un boletin formal por estudiante y trimestre, con todas sus materias,
              promedio general y desempeno cualitativo.
            </p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Consolidado por curso</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : courses.size === 0 ? (
            <p className="text-sm text-gray-600">Aun no hay datos para consolidar.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Curso</th>
                    <th className="px-3 py-2">Estudiantes</th>
                    <th className="px-3 py-2">Calificaciones cargadas</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(courses.entries()).map(([course, info]) => (
                    <tr key={course} className="border-t border-gray-100">
                      <td className="px-3 py-2">{course}</td>
                      <td className="px-3 py-2">{info.students.size}</td>
                      <td className="px-3 py-2">{info.grades}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          Volver al dashboard
        </Link>
      </main>
    </div>
  );
}
