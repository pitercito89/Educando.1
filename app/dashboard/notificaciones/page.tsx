import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  listAttendanceAlerts,
  listNotificationLogs,
  listStudentsBySubjectIds,
  listStudents,
  listSubjectsByTeacherUserId,
} from "@/lib/db";
import { NotificationForm } from "./notification-form";
import { MeetingForm } from "./meeting-form";

export default async function NotificacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["admin", "director", "docente"].includes(session.role)) redirect("/dashboard");
  const canEdit = ["admin", "director", "docente"].includes(session.role);
  const [studentsResult, logsResult, alertsResult] = await Promise.all([
    listStudents(),
    listNotificationLogs(80),
    listAttendanceAlerts(3),
  ]);

  const setupError = studentsResult.error ?? logsResult.error ?? alertsResult.error;
  let students = studentsResult.data ?? [];
  let logs = logsResult.data ?? [];
  let alerts = alertsResult.data ?? [];
  let courses = Array.from(new Set(students.map((student) => student.course))).sort();

  if (session.role === "docente") {
    if (!session.schoolUserId) {
      students = [];
      logs = [];
      alerts = [];
      courses = [];
    } else {
      const subjectsResult = await listSubjectsByTeacherUserId(session.schoolUserId);
      const subjectIds = subjectsResult.data?.map((item) => item.id) ?? [];
      const studentsBySubject = await listStudentsBySubjectIds(subjectIds);
      students = studentsBySubject.data ?? [];
      const allowedIds = new Set(students.map((student) => student.id));
      logs = logs.filter((log) => !log.student_id || allowedIds.has(log.student_id));
      alerts = alerts.filter((alert) => allowedIds.has(alert.student_id));
      courses = Array.from(new Set(students.map((student) => student.course))).sort();
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#eef6ff_0%,#f7fbff_45%,#f3f8ff_100%)] p-4 md:p-8">
      <main className="mx-auto max-w-5xl rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_-36px_rgba(23,66,130,0.65)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Comunicacion Escolar</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Modulo: Notificaciones</h1>
        <p className="mt-2 text-gray-700">
          Integracion de alertas y bitacora de notificaciones (simulacion Telegram + interno).
        </p>

        <section className="mt-5">
          <h2 className="font-semibold text-gray-800 mb-2">Registrar envio</h2>
          {canEdit ? (
            <NotificationForm
              students={students}
              allowGeneral={session.role !== "docente"}
              eventTypes={
                session.role === "docente"
                  ? ["reunion_curso", "conducta", "tarea", "recordatorio"]
                  : undefined
              }
              readOnlyStatus={session.role === "docente"}
            />
          ) : (
            <p className="text-sm text-gray-600">Solo lectura para el rol director.</p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Aviso de reunion a padres</h2>
          {canEdit ? (
            <MeetingForm courses={courses} requireCourse={session.role === "docente"} />
          ) : (
            <p className="text-sm text-gray-600">Solo lectura para el rol director.</p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Alertas recomendadas</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-gray-600">
              No hay estudiantes con incidencias recurrentes por asistencia.
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
          <h2 className="font-semibold text-gray-800 mb-2">Bitacora de notificaciones</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
              <p className="mt-1">Ejecuta `database/schema.sql` para habilitar este modulo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Evento</th>
                    <th className="px-3 py-2">Canal</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Destino</th>
                    <th className="px-3 py-2">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-gray-100 align-top">
                      <td className="px-3 py-2">
                        {new Date(log.created_at).toLocaleString("es-BO")}
                      </td>
                      <td className="px-3 py-2">{log.event_type}</td>
                      <td className="px-3 py-2">{log.channel}</td>
                      <td className="px-3 py-2 capitalize">{log.status}</td>
                      <td className="px-3 py-2">
                        {log.student ? `${log.student.full_name} (${log.student.course})` : "General"}
                      </td>
                      <td className="px-3 py-2">{log.message}</td>
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
