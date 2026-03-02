import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "./actions";
import {
  getParentById,
  getStudentById,
  listAttendanceAlerts,
  listAttendanceRecords,
  listGradeRecords,
  listSubjectStudentEnrollments,
  listSubjectsByTeacherUserId,
  listStudents,
} from "@/lib/db";
import {
  generateParentTelegramCodeAction,
  generateStudentTelegramCodeAction,
} from "./telegram-actions";
import { TelegramLinkBox } from "./telegram-link-box";

const adminModules = [
  {
    title: "Gestion de Usuarios",
    href: "/dashboard/usuarios",
    description: "Crear cuentas, roles y asignaciones academicas.",
  },
  {
    title: "Calificaciones",
    href: "/dashboard/calificaciones",
    description: "Control de notas por curso, materia y periodo.",
  },
  {
    title: "Asistencias",
    href: "/dashboard/asistencias",
    description: "Registro diario con alertas por faltas.",
  },
  {
    title: "Notificaciones",
    href: "/dashboard/notificaciones",
    description: "Mensajes a estudiantes y padres por Telegram.",
  },
  {
    title: "Reportes",
    href: "/dashboard/reportes",
    description: "Resumenes y exportaciones para direccion.",
  },
  {
    title: "Auditoria",
    href: "/dashboard/auditoria",
    description: "Trazabilidad de cambios y acciones del sistema.",
  },
];

const docenteModules = [
  {
    title: "Calificaciones",
    href: "/dashboard/calificaciones",
    description: "Registrar notas solo en materias asignadas.",
  },
  {
    title: "Asistencias",
    href: "/dashboard/asistencias",
    description: "Lista diaria de estudiantes de tus cursos.",
  },
  {
    title: "Notificaciones",
    href: "/dashboard/notificaciones",
    description: "Avisos de aula para padres y estudiantes vinculados.",
  },
];

const directorModules = [
  {
    title: "Reportes",
    href: "/dashboard/reportes",
    description: "Seguimiento institucional y analisis academico.",
  },
  {
    title: "Notificaciones",
    href: "/dashboard/notificaciones",
    description: "Comunicados generales y por curso.",
  },
  {
    title: "Auditoria",
    href: "/dashboard/auditoria",
    description: "Revision de trazas y control institucional.",
  },
];

function roleLabel(role: string): string {
  if (role === "admin") return "Administrador";
  if (role === "docente") return "Docente";
  if (role === "director") return "Director";
  if (role === "estudiante") return "Estudiante";
  if (role === "padre") return "Padre/Madre";
  return role;
}

function rolePalette(role: string): { badge: string; title: string } {
  if (role === "admin") {
    return { badge: "bg-blue-100 text-blue-800", title: "text-blue-700" };
  }
  if (role === "docente") {
    return { badge: "bg-emerald-100 text-emerald-800", title: "text-emerald-700" };
  }
  if (role === "director") {
    return { badge: "bg-amber-100 text-amber-800", title: "text-amber-700" };
  }
  if (role === "estudiante") {
    return { badge: "bg-indigo-100 text-indigo-800", title: "text-indigo-700" };
  }
  return { badge: "bg-fuchsia-100 text-fuchsia-800", title: "text-fuchsia-700" };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "TuBot";
  const palette = rolePalette(session.role);

  if (session.role === "estudiante") {
    if (!session.studentId) redirect("/login");
    const [studentResult, gradesResult, attendanceResult] = await Promise.all([
      getStudentById(session.studentId),
      listGradeRecords({ limit: 30, studentId: session.studentId }),
      listAttendanceRecords({ limit: 30, studentId: session.studentId }),
    ]);

    const student = studentResult.data;
    const grades = gradesResult.data ?? [];
    const attendance = attendanceResult.data ?? [];
    const faltas = attendance.filter((item) => item.status === "falta").length;

    return (
      <div className="min-h-screen bg-[linear-gradient(160deg,#eef5ff_0%,#f7fbff_45%,#eef8ff_100%)] p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_50px_-32px_rgba(22,54,108,0.6)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${palette.badge}`}>
                  {roleLabel(session.role)}
                </span>
                <h1 className={`text-2xl font-extrabold md:text-3xl ${palette.title}`}>
                  Estudiante
                </h1>
                <p className="text-sm text-gray-600">
                  Bienvenido, <span className="font-semibold">{session.fullName}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/cuenta"
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Mi cuenta
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Cerrar Sesion
                  </button>
                </form>
              </div>
            </div>
          </header>

          <main className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <article className="rounded-2xl bg-white p-5 shadow-md md:col-span-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">Curso</p>
              <p className="mt-2 text-2xl font-black text-blue-700">{student?.course ?? "-"}</p>
            </article>
            <article className="rounded-2xl bg-white p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-gray-500">Calificaciones</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">{grades.length}</p>
            </article>
            <article className="rounded-2xl bg-white p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-gray-500">Asistencias</p>
              <p className="mt-2 text-2xl font-black text-violet-700">{attendance.length}</p>
            </article>
            <article className="rounded-2xl bg-white p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-gray-500">Faltas</p>
              <p className="mt-2 text-2xl font-black text-rose-700">{faltas}</p>
            </article>
          </main>

          <section className="rounded-2xl bg-white p-5 shadow-md">
            <h2 className="text-lg font-bold text-slate-900">Ultimas calificaciones</h2>
            {grades.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Aun no tienes calificaciones registradas.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {grades.slice(0, 8).map((item) => (
                  <li key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    {item.subject.name} ({item.term}) -{" "}
                    <span className="font-semibold text-slate-900">{item.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div>
            <TelegramLinkBox
              title="Vincular Telegram"
              description="Genera un codigo y envialo al bot para recibir notificaciones instantaneas."
              botUsername={botUsername}
              existingCode={student?.telegram_link_code}
              existingChatId={student?.telegram_chat_id}
              action={generateStudentTelegramCodeAction}
            />
          </div>
        </div>
      </div>
    );
  }

  if (session.role === "padre") {
    if (!session.parentId || !session.studentId) redirect("/login");
    const [parentResult, gradesResult, attendanceResult] = await Promise.all([
      getParentById(session.parentId),
      listGradeRecords({ limit: 30, studentId: session.studentId }),
      listAttendanceRecords({ limit: 30, studentId: session.studentId }),
    ]);

    const parent = parentResult.data;
    const grades = gradesResult.data ?? [];
    const attendance = attendanceResult.data ?? [];
    const faltas = attendance.filter((item) => item.status === "falta").length;

    return (
      <div className="min-h-screen bg-[linear-gradient(160deg,#fff7eb_0%,#fffdf7_38%,#f7f8ff_100%)] p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_20px_50px_-32px_rgba(122,67,19,0.45)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${palette.badge}`}>
                  {roleLabel(session.role)}
                </span>
                <h1 className={`text-2xl font-extrabold md:text-3xl ${palette.title}`}>
                  Padre/Madre
                </h1>
                <p className="text-sm text-gray-600">
                  Bienvenido, <span className="font-semibold">{session.fullName}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/cuenta"
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Mi cuenta
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Cerrar Sesion
                  </button>
                </form>
              </div>
            </div>
          </header>

          <main className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <article className="rounded-2xl bg-white p-5 shadow-md md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">Estudiante vinculado</p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {parent?.student?.full_name ?? "-"}
              </p>
            </article>
            <article className="rounded-2xl bg-white p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-gray-500">Curso</p>
              <p className="mt-2 text-2xl font-black text-blue-700">{parent?.student?.course ?? "-"}</p>
            </article>
            <article className="rounded-2xl bg-white p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-gray-500">Incidencias (falta)</p>
              <p className="mt-2 text-2xl font-black text-rose-700">{faltas}</p>
            </article>
          </main>

          <section className="rounded-2xl bg-white p-5 shadow-md">
            <h2 className="text-lg font-bold text-slate-900">Seguimiento academico</h2>
            {grades.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">No hay calificaciones para mostrar.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {grades.slice(0, 8).map((item) => (
                  <li key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    {item.subject.name} ({item.term}) -{" "}
                    <span className="font-semibold text-slate-900">{item.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div>
            <TelegramLinkBox
              title="Vincular Telegram"
              description="Genera un codigo y envialo al bot para recibir alertas del estudiante."
              botUsername={botUsername}
              existingCode={parent?.telegram_link_code}
              existingChatId={parent?.telegram_chat_id}
              action={generateParentTelegramCodeAction}
            />
          </div>
        </div>
      </div>
    );
  }

  if (session.role === "docente") {
    if (!session.schoolUserId) redirect("/login");
    const [
      teacherSubjectsResult,
      enrollmentsResult,
      attendanceResult,
      alertsResult,
    ] = await Promise.all([
      listSubjectsByTeacherUserId(session.schoolUserId),
      listSubjectStudentEnrollments(),
      listAttendanceRecords({ date: today, limit: 300 }),
      listAttendanceAlerts(3),
    ]);

    const teacherSubjects = teacherSubjectsResult.data ?? [];
    const teacherSubjectIds = new Set(teacherSubjects.map((item) => item.id));
    const teacherEnrollments = (enrollmentsResult.data ?? []).filter((row) =>
      teacherSubjectIds.has(row.subject_id)
    );

    const cardsMap = new Map<
      string,
      { subjectId: number; subjectName: string; course: string; studentsCount: number }
    >();
    for (const row of teacherEnrollments) {
      const course = row.student?.course ?? "";
      if (!course) continue;
      const key = `${row.subject_id}|||${course}`;
      const current = cardsMap.get(key);
      if (current) {
        current.studentsCount += 1;
      } else {
        cardsMap.set(key, {
          subjectId: row.subject_id,
          subjectName: row.subject?.name ?? "Materia",
          course,
          studentsCount: 1,
        });
      }
    }
    const subjectCards = Array.from(cardsMap.values()).sort((a, b) => {
      const bySubject = a.subjectName.localeCompare(b.subjectName);
      if (bySubject !== 0) return bySubject;
      return a.course.localeCompare(b.course);
    });

    const totalStudents = teacherEnrollments.length;
    const attendanceToday = (attendanceResult.data ?? []).filter((item) =>
      teacherEnrollments.some((row) => row.student_id === item.student_id)
    );
    const alerts = (alertsResult.data ?? []).filter((item) =>
      teacherEnrollments.some((row) => row.student_id === item.student_id)
    );

    return (
      <div className="min-h-screen bg-[linear-gradient(145deg,#eef5ff_0%,#f8fbff_42%,#f4f7ff_100%)] p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_22px_52px_-35px_rgba(16,64,124,0.6)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${palette.badge}`}>
                  {roleLabel(session.role)}
                </span>
                <h1 className={`text-2xl font-extrabold md:text-3xl ${palette.title}`}>
                  Docente
                </h1>
                <p className="text-sm text-gray-600">
                  Sesion activa de <span className="font-semibold">{session.fullName}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/cuenta"
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Mi cuenta
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Cerrar Sesion
                  </button>
                </form>
              </div>
            </div>
          </header>

          <main className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <section className="rounded-2xl bg-white p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-gray-500">Materias-Curso</p>
              <p className="mt-2 text-3xl font-black text-blue-700">{subjectCards.length}</p>
            </section>
            <section className="rounded-2xl bg-white p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-gray-500">Estudiantes asignados</p>
              <p className="mt-2 text-3xl font-black text-emerald-700">{totalStudents}</p>
            </section>
            <section className="rounded-2xl bg-white p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-gray-500">Alertas pendientes</p>
              <p className="mt-2 text-3xl font-black text-rose-700">{alerts.length}</p>
            </section>
          </main>

          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">Mis materias asignadas</h2>
            {subjectCards.length === 0 ? (
              <p className="rounded-2xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
                No tienes materias con estudiantes asignados todavia.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {subjectCards.map((card) => (
                  <article
                    key={`${card.subjectId}-${card.course}`}
                    className="rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_12px_32px_-24px_rgba(19,63,124,0.8)]"
                  >
                    <h3 className="text-lg font-bold text-blue-700">
                      {card.subjectName} {card.course}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Estudiantes: <span className="font-semibold">{card.studentsCount}</span>
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/calificaciones?view=operativa&course=${encodeURIComponent(
                          card.course
                        )}&subject=${card.subjectId}`}
                        className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Calificar
                      </Link>
                      <Link
                        href={`/dashboard/asistencias?course=${encodeURIComponent(
                          card.course
                        )}&subject=${card.subjectId}`}
                        className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        Tomar asistencia
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-md">
            <h2 className="text-lg font-bold text-slate-900">Asistencia de hoy</h2>
            <p className="mt-2 text-sm text-gray-700">
              Registros tomados hoy en tus cursos/materias:{" "}
              <span className="font-semibold">{attendanceToday.length}</span>
            </p>
          </section>
        </div>
      </div>
    );
  }

  const [studentsResult, attendanceResult, alertsResult] = await Promise.all([
    listStudents(),
    listAttendanceRecords({ date: today, limit: 300 }),
    listAttendanceAlerts(3),
  ]);

  const studentsCount = studentsResult.data?.length ?? 0;
  const attendanceToday =
    attendanceResult.data?.filter((item) => item.status === "presente").length ?? 0;
  const alertsCount = alertsResult.data?.length ?? 0;
  const modules =
    session.role === "admin"
      ? adminModules
      : session.role === "docente"
      ? docenteModules
      : directorModules;

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#eef5ff_0%,#f8fbff_42%,#f4f7ff_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_22px_52px_-35px_rgba(16,64,124,0.6)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${palette.badge}`}>
                {roleLabel(session.role)}
              </span>
              <h1 className={`text-2xl font-extrabold md:text-3xl ${palette.title}`}>
                {roleLabel(session.role)}
              </h1>
              <p className="text-sm text-gray-600">
                Sesion activa de <span className="font-semibold">{session.fullName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/cuenta"
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Mi cuenta
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Cerrar Sesion
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="rounded-2xl bg-white p-5 shadow-md">
            <p className="text-xs uppercase tracking-wide text-gray-500">Estudiantes</p>
            <p className="mt-2 text-3xl font-black text-blue-700">{studentsCount}</p>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-md">
            <p className="text-xs uppercase tracking-wide text-gray-500">Asistencias hoy</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">{attendanceToday}</p>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-md">
            <p className="text-xs uppercase tracking-wide text-gray-500">Alertas pendientes</p>
            <p className="mt-2 text-3xl font-black text-rose-700">{alertsCount}</p>
          </section>
        </main>

        <section>
          <h2 className="mb-3 text-xl font-bold text-slate-900">Modulos disponibles</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <article
                key={module.href}
                className="rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_12px_32px_-24px_rgba(19,63,124,0.8)]"
              >
                <h3 className="text-lg font-bold text-blue-700">{module.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{module.description}</p>
                <Link
                  href={module.href}
                  className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Abrir modulo
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
