import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  listAttendanceAlerts,
  listAttendanceRecords,
  listStudents,
  listStudentsBySubjectIds,
  listSubjectsByTeacherUserId,
} from "@/lib/db";
import { AttendanceForm } from "./attendance-form";

export default async function AsistenciasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["admin", "docente", "director"].includes(session.role)) redirect("/dashboard");
  const canEdit = session.role === "admin" || session.role === "docente";
  const today = new Date().toISOString().slice(0, 10);

  const [studentsResult, todayAttendanceResult, historyResult, alertsResult] =
    await Promise.all([
      listStudents(),
      listAttendanceRecords({ date: today, limit: 200 }),
      listAttendanceRecords({ limit: 60 }),
      listAttendanceAlerts(3),
    ]);

  const setupError =
    studentsResult.error ??
    todayAttendanceResult.error ??
    historyResult.error ??
    alertsResult.error;

  let students = studentsResult.data ?? [];
  let todayAttendance = todayAttendanceResult.data ?? [];
  let history = historyResult.data ?? [];
  let alerts = alertsResult.data ?? [];

  if (session.role === "docente") {
    if (!session.schoolUserId) {
      students = [];
      todayAttendance = [];
      history = [];
      alerts = [];
    } else {
      const subjectsResult = await listSubjectsByTeacherUserId(session.schoolUserId);
      const teacherSubjects = subjectsResult.data ?? [];
      const teacherSubjectIds = teacherSubjects.map((item) => item.id);
      const studentsBySubjectResult = await listStudentsBySubjectIds(teacherSubjectIds);
      students = studentsBySubjectResult.data ?? [];
      const studentIds = new Set(students.map((item) => item.id));
      todayAttendance = todayAttendance.filter((item) => studentIds.has(item.student_id));
      history = history.filter((item) => studentIds.has(item.student_id));
      alerts = alerts.filter((item) => studentIds.has(item.student_id));
    }
  }

  const presentes = todayAttendance.filter((item) => item.status === "presente").length;
  const incidencias = todayAttendance.filter((item) => item.status === "falta").length;

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#eef6ff_0%,#f7fbff_45%,#f3f8ff_100%)] p-4 md:p-8">
      <main className="mx-auto max-w-5xl rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_-36px_rgba(23,66,130,0.65)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Control Diario</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Modulo: Asistencias</h1>
        <p className="mt-2 text-gray-700">
          Control diario por curso con opciones de presente, licencia y falta.
        </p>

        <section className="mt-5">
          <h2 className="font-semibold text-gray-800 mb-2">Registrar asistencia diaria</h2>
          {!canEdit ? (
            <p className="text-sm text-gray-600">Solo lectura para el rol director.</p>
          ) : students.length === 0 ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              Primero debes registrar estudiantes en el modulo de calificaciones.
            </div>
          ) : (
            <AttendanceForm students={students} defaultDate={today} />
          )}
        </section>

        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <article className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Registros hoy</p>
            <p className="text-2xl font-bold text-blue-700">{todayAttendance.length}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Presentes</p>
            <p className="text-2xl font-bold text-green-700">{presentes}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Incidencias</p>
            <p className="text-2xl font-bold text-red-700">{incidencias}</p>
          </article>
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Alertas por reincidencia</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
              <p className="mt-1">
                Ejecuta el `database/schema.sql` actualizado para habilitar asistencias.
              </p>
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-gray-600">
              Sin alertas criticas (se marca alerta con 3 o mas faltas/incidencias).
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Estudiante</th>
                    <th className="px-3 py-2">Curso</th>
                    <th className="px-3 py-2">Incidencias</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.student_id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{alert.full_name}</td>
                      <td className="px-3 py-2">{alert.course}</td>
                      <td className="px-3 py-2 font-semibold text-red-700">{alert.incidents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Ultimos registros</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Estudiante</th>
                    <th className="px-3 py-2">Curso</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{item.attendance_date}</td>
                      <td className="px-3 py-2">{item.student.full_name}</td>
                      <td className="px-3 py-2">{item.student.course}</td>
                      <td className="px-3 py-2 capitalize">{item.status}</td>
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
