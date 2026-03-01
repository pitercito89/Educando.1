import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  listEvaluationActivities,
  listEvaluationScores,
  listGradeRecords,
  listParents,
  listSchoolUsers,
  listStudents,
  listStudentsBySubjectIds,
  listSubjectStudentEnrollments,
  listSubjects,
  listSubjectsByTeacherUserId,
  listTeacherSubjectAssignments,
} from "@/lib/db";
import { StudentForm } from "./student-form";
import { SubjectForm } from "./subject-form";
import { TeacherSubjectForm } from "./teacher-subject-form";
import { StudentSubjectForm } from "./student-subject-form";
import { EvaluationActivityForm } from "./evaluation-activity-form";
import { EvaluationScoreForm } from "./evaluation-score-form";
import { ConsolidateGradeForm } from "./consolidate-grade-form";
import { BulkEvaluationScoreForm } from "./bulk-evaluation-score-form";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? "").trim();
  return (value ?? "").trim();
}

export default async function CalificacionesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const selectedCourse = pickParam(params.course);
  const selectedTeacher = pickParam(params.teacher);
  const selectedSubject = pickParam(params.subject);

  const session = await getSession();
  if (!session) redirect("/login");
  if (!["admin", "docente", "director"].includes(session.role)) redirect("/dashboard");
  const canGrade = session.role === "admin" || session.role === "docente";
  const canAdminCatalog = session.role === "admin";

  const [
    gradesResult,
    activitiesResult,
    scoresResult,
    allStudentsResult,
    allSubjectsResult,
    parentsResult,
    usersResult,
    teacherAssignmentsResult,
    enrollmentResult,
  ] = await Promise.all([
    listGradeRecords(),
    listEvaluationActivities({ limit: 500 }),
    listEvaluationScores(150),
    listStudents(),
    listSubjects(),
    listParents(),
    listSchoolUsers(),
    listTeacherSubjectAssignments(),
    listSubjectStudentEnrollments(),
  ]);

  const setupError =
    allStudentsResult.error ??
    allSubjectsResult.error ??
    gradesResult.error ??
    activitiesResult.error ??
    scoresResult.error ??
    parentsResult.error ??
    usersResult.error ??
    teacherAssignmentsResult.error ??
    enrollmentResult.error;

  let students = allStudentsResult.data ?? [];
  let subjects = allSubjectsResult.data ?? [];
  let grades = gradesResult.data ?? [];
  let activities = activitiesResult.data ?? [];
  let scores = scoresResult.data ?? [];
  const parents = parentsResult.data ?? [];
  const users = usersResult.data ?? [];
  const teacherAssignments = teacherAssignmentsResult.data ?? [];
  const enrollments = enrollmentResult.data ?? [];
  const teachers = users.filter((user) => user.role === "docente");

  if (session.role === "docente") {
    if (!session.schoolUserId) {
      students = [];
      subjects = [];
      grades = [];
    } else {
      const subjectsByTeacher = await listSubjectsByTeacherUserId(session.schoolUserId);
      if (subjectsByTeacher.error || !subjectsByTeacher.data) {
        students = [];
        subjects = [];
        grades = [];
        activities = [];
        scores = [];
      } else {
        subjects = subjectsByTeacher.data;
        const allowedSubjectIds = subjects.map((item) => item.id);
        const studentsBySubjects = await listStudentsBySubjectIds(allowedSubjectIds);
        students = studentsBySubjects.data ?? [];
        grades = grades.filter((item) => allowedSubjectIds.includes(item.subject_id));
        activities = activities.filter((item) => allowedSubjectIds.includes(item.subject_id));
        const allowedActivityIds = new Set(activities.map((item) => item.id));
        scores = scores.filter((item) => allowedActivityIds.has(item.activity_id));
      }
    }
  }

  const teacherNamesBySubject = new Map<number, string[]>();
  for (const assignment of teacherAssignments) {
    const current = teacherNamesBySubject.get(assignment.subject_id) ?? [];
    const teacherName = assignment.teacher?.full_name ?? assignment.teacher?.username ?? "Sin docente";
    if (!current.includes(teacherName)) {
      current.push(teacherName);
      teacherNamesBySubject.set(assignment.subject_id, current);
    }
  }

  const getTeacherLabelBySubjectId = (subjectId: number): string => {
    const teacherNames = teacherNamesBySubject.get(subjectId) ?? [];
    return teacherNames.length > 0 ? teacherNames.join(", ") : "Sin docente asignado";
  };

  const filteredGrades = grades.filter((grade) => {
    const byCourse = selectedCourse ? grade.student.course === selectedCourse : true;
    const bySubject = selectedSubject ? String(grade.subject.id) === selectedSubject : true;
    const byTeacher = selectedTeacher
      ? getTeacherLabelBySubjectId(grade.subject_id) === selectedTeacher
      : true;
    return byCourse && bySubject && byTeacher;
  });

  const courseOptions = Array.from(new Set(grades.map((grade) => grade.student.course))).sort();
  const subjectOptions = Array.from(
    new Map(grades.map((grade) => [grade.subject.id, grade.subject])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
  const teacherOptions = Array.from(
    new Set(grades.map((grade) => getTeacherLabelBySubjectId(grade.subject_id)))
  ).sort();

  const groupedGrades = new Map<
    string,
    { teacherLabel: string; course: string; items: typeof grades }
  >();
  for (const grade of filteredGrades) {
    const course = grade.student.course || "Sin curso";
    const teacherLabel = getTeacherLabelBySubjectId(grade.subject_id);
    const key =
      session.role === "docente" ? course : `${teacherLabel}|||${course}`;

    const group = groupedGrades.get(key);
    if (group) {
      group.items.push(grade);
    } else {
      groupedGrades.set(key, {
        teacherLabel,
        course,
        items: [grade],
      });
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#eef6ff_0%,#f7fbff_40%,#f3f8ff_100%)] p-4 md:p-8">
      <main className="mx-auto max-w-5xl rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_-36px_rgba(23,66,130,0.65)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Modulo Academico</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Modulo: Calificaciones</h1>
        <p className="mt-2 text-gray-700">
          Modelo academico con dimensiones Saber, Hacer, Ser y Decidir.
          Calificaciones enlazadas por llaves foraneas a estudiantes y materias.
        </p>

        {canAdminCatalog ? (
          <>
            <section className="mt-5">
              <h2 className="font-semibold text-gray-800 mb-2">1) Registrar estudiantes</h2>
              <StudentForm />
            </section>

            <section className="mt-6">
              <h2 className="font-semibold text-gray-800 mb-2">2) Registrar materias</h2>
              <SubjectForm />
            </section>

            <section className="mt-6">
              <h2 className="font-semibold text-gray-800 mb-2">3) Asignar docente a materia</h2>
              <TeacherSubjectForm teachers={teachers} subjects={allSubjectsResult.data ?? []} />
            </section>

            <section className="mt-6">
              <h2 className="font-semibold text-gray-800 mb-2">4) Asignar estudiantes a materia</h2>
              <StudentSubjectForm
                students={allStudentsResult.data ?? []}
                subjects={allSubjectsResult.data ?? []}
              />
            </section>
          </>
        ) : null}

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">5) Crear actividad evaluativa</h2>
          {!canGrade ? (
            <p className="text-sm text-gray-600">Solo lectura para el rol director.</p>
          ) : students.length === 0 || subjects.length === 0 ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              No hay estudiantes/materias habilitados para tu perfil.
            </div>
          ) : (
            <EvaluationActivityForm subjects={subjects} />
          )}
          <p className="text-xs text-gray-500 mt-2">
            Ejemplo: Examen, practico o proyecto por dimension y con peso.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">6) Registrar nota por instrumento</h2>
          {!canGrade ? (
            <p className="text-sm text-gray-600">Solo lectura para el rol director.</p>
          ) : activities.length === 0 ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              Primero crea una actividad evaluativa.
            </div>
          ) : (
            <EvaluationScoreForm
              activities={activities}
              students={students}
              enrollments={enrollments}
            />
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">6.1) Carga masiva por planilla (tipo libreta)</h2>
          {!canGrade ? (
            <p className="text-sm text-gray-600">Solo lectura para el rol director.</p>
          ) : activities.length === 0 ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              Primero crea una actividad evaluativa para habilitar planilla.
            </div>
          ) : (
            <BulkEvaluationScoreForm
              activities={activities}
              students={students}
              enrollments={enrollments}
            />
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">7) Consolidar trimestre</h2>
          {!canGrade ? (
            <p className="text-sm text-gray-600">Solo lectura para el rol director.</p>
          ) : (
            <ConsolidateGradeForm
              students={students}
              subjects={subjects}
              activities={activities}
              enrollments={enrollments}
            />
          )}
          <p className="text-xs text-gray-500 mt-2">
            Formula actual: Total = 35% Saber + 35% Hacer + 15% Ser + 15% Decidir.
          </p>
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-gray-700">
            <p className="font-semibold text-blue-800">Guia para docente</p>
            <p className="mt-1">
              Cada registro es la nota consolidada de una materia en un periodo/trimestre. Puedes
              evaluar con examen, practico, tarea o proyecto y luego cargar el promedio final por
              dimension: Saber, Hacer, Ser y Decidir.
            </p>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Ultimas notas por instrumento</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : scores.length === 0 ? (
            <p className="text-sm text-gray-600">Aun no hay notas por instrumentos registradas.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Estudiante</th>
                    <th className="px-3 py-2">Curso</th>
                    <th className="px-3 py-2">Materia</th>
                    <th className="px-3 py-2">Instrumento</th>
                    <th className="px-3 py-2">Dimension</th>
                    <th className="px-3 py-2">Peso</th>
                    <th className="px-3 py-2">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{new Date(row.created_at).toLocaleString("es-BO")}</td>
                      <td className="px-3 py-2">{row.student?.full_name ?? "-"}</td>
                      <td className="px-3 py-2">{row.activity?.course ?? row.student?.course ?? "-"}</td>
                      <td className="px-3 py-2">{row.activity?.subject?.name ?? "-"}</td>
                      <td className="px-3 py-2 capitalize">{row.activity?.instrument_type ?? "-"}</td>
                      <td className="px-3 py-2 capitalize">{row.activity?.dimension ?? "-"}</td>
                      <td className="px-3 py-2">{row.activity?.weight ?? "-"}</td>
                      <td className="px-3 py-2 font-semibold">{row.score.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Asignaciones docente-materia</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : teacherAssignments.length === 0 ? (
            <p className="text-sm text-gray-600">Sin asignaciones aun.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Docente</th>
                    <th className="px-3 py-2">Materia</th>
                    <th className="px-3 py-2">Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherAssignments.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{item.teacher?.full_name ?? "-"}</td>
                      <td className="px-3 py-2">{item.subject?.name ?? "-"}</td>
                      <td className="px-3 py-2">{item.subject?.level ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Asignaciones estudiante-materia</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-gray-600">Sin asignaciones aun.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Estudiante</th>
                    <th className="px-3 py-2">Curso</th>
                    <th className="px-3 py-2">Materia</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{item.student?.full_name ?? "-"}</td>
                      <td className="px-3 py-2">{item.student?.course ?? "-"}</td>
                      <td className="px-3 py-2">{item.subject?.name ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Cuentas de padres/madres</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : parents.length === 0 ? (
            <p className="text-sm text-gray-600">Aun no hay cuentas de padre/madre registradas.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Padre/Madre</th>
                    <th className="px-3 py-2">Usuario</th>
                    <th className="px-3 py-2">Estudiante</th>
                    <th className="px-3 py-2">Curso</th>
                  </tr>
                </thead>
                <tbody>
                  {parents.map((parent) => (
                    <tr key={parent.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{parent.full_name}</td>
                      <td className="px-3 py-2">{parent.username}</td>
                      <td className="px-3 py-2">{parent.student?.full_name ?? "-"}</td>
                      <td className="px-3 py-2">{parent.student?.course ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Filtros de visualizacion</h2>
          <form className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-blue-50 p-4 md:grid-cols-4">
            <select
              name="course"
              defaultValue={selectedCourse}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos los cursos</option>
              {courseOptions.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>

            <select
              name="subject"
              defaultValue={selectedSubject}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas las materias</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.level})
                </option>
              ))}
            </select>

            {session.role !== "docente" ? (
              <select
                name="teacher"
                defaultValue={selectedTeacher}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Todos los docentes</option>
                {teacherOptions.map((teacher) => (
                  <option key={teacher} value={teacher}>
                    {teacher}
                  </option>
                ))}
              </select>
            ) : (
              <input type="hidden" name="teacher" value="" />
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Aplicar
              </button>
              <Link
                href="/dashboard/calificaciones"
                className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Limpiar
              </Link>
            </div>
          </form>
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Calificaciones ordenadas</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
              <p className="mt-1">
                Configura `.env.local` y ejecuta `database/schema.sql` actualizado en Supabase.
              </p>
            </div>
          ) : groupedGrades.size === 0 ? (
            <p className="text-sm text-gray-600">Aun no hay calificaciones registradas.</p>
          ) : (
            <div className="space-y-4">
              {Array.from(groupedGrades.values()).map((group) => (
                <article key={`${group.teacherLabel}-${group.course}`} className="overflow-x-auto rounded-2xl border border-gray-200">
                  <div className="border-b border-gray-200 bg-blue-50 px-4 py-3">
                    {session.role === "docente" ? (
                      <p className="text-sm font-semibold text-blue-800">
                        Curso: {group.course} ({group.items.length} calificaciones)
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-blue-800">
                        Docente: {group.teacherLabel} | Curso: {group.course} ({group.items.length} calificaciones)
                      </p>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-white text-left">
                      <tr>
                        <th className="px-3 py-2">Estudiante</th>
                        <th className="px-3 py-2">Materia</th>
                        <th className="px-3 py-2">Periodo</th>
                        <th className="px-3 py-2">Total</th>
                        <th className="px-3 py-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((grade) => (
                        <tr key={grade.id} className="border-t border-gray-100">
                          <td className="px-3 py-2">{grade.student.full_name}</td>
                          <td className="px-3 py-2">{grade.subject.name}</td>
                          <td className="px-3 py-2">{grade.term}</td>
                          <td className="px-3 py-2 font-semibold">{grade.total.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            {new Date(grade.created_at).toLocaleString("es-BO")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              ))}
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
