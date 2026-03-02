import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  listParents,
  listSchoolUsers,
  listStudents,
  listSubjects,
  listTeacherSubjectAssignments,
} from "@/lib/db";
import { UserForm } from "./user-form";
import { TeacherSubjectForm } from "./teacher-subject-form";
import { SchoolUserEditForm } from "./school-user-edit-form";
import { StudentEditForm } from "./student-edit-form";
import { ParentEditForm } from "./parent-edit-form";
import { GraduateCourseForm, PromoteCourseForm } from "./lifecycle-forms";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? "").trim();
  return (value ?? "").trim();
}

export default async function UsuariosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const selectedCourse = pickParam(params.course);
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");
  const [usersResult, studentsResult, parentsResult, subjectsResult, assignmentsResult] =
    await Promise.all([
    listSchoolUsers(),
    listStudents(),
    listParents(),
    listSubjects(),
    listTeacherSubjectAssignments(),
  ]);

  const result = usersResult;
  const subjects = subjectsResult.data ?? [];
  const students = studentsResult.data ?? [];
  const parents = parentsResult.data ?? [];
  const assignments = assignmentsResult.data ?? [];
  const teachers = (usersResult.data ?? []).filter((user) => user.role === "docente");
  const roleCounts = {
    admin: (usersResult.data ?? []).filter((user) => user.role === "admin").length,
    director: (usersResult.data ?? []).filter((user) => user.role === "director").length,
    docente: (usersResult.data ?? []).filter((user) => user.role === "docente").length,
    estudiantes: students.length,
  };
  const courseOptions = Array.from(new Set(students.map((student) => student.course))).sort();
  const visibleStudents = selectedCourse
    ? students.filter((student) => student.course === selectedCourse)
    : [];
  const parentNamesByStudent = new Map<number, string[]>();
  for (const parent of parents) {
    const current = parentNamesByStudent.get(parent.student_id) ?? [];
    current.push(parent.full_name);
    parentNamesByStudent.set(parent.student_id, current);
  }
  const filteredParents = selectedCourse
    ? parents.filter((parent) => parent.student?.course === selectedCourse)
    : [];
  const setupError =
    usersResult.error ??
    studentsResult.error ??
    parentsResult.error ??
    subjectsResult.error ??
    assignmentsResult.error;

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#eef6ff_0%,#f7fbff_45%,#eef8ff_100%)] p-4 md:p-8">
      <main className="mx-auto max-w-5xl rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_-36px_rgba(23,66,130,0.65)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Panel Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Modulo: Gestion de Usuarios</h1>
        <p className="mt-2 text-gray-700">
          Base RBAC conectada a PostgreSQL (Supabase). El acceso al sistema
          queda reservado al administrador por defecto.
        </p>

        <section className="mt-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <article className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Administradores</p>
              <p className="mt-1 text-3xl font-extrabold text-blue-800">{roleCounts.admin}</p>
            </article>
            <article className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">Directores</p>
              <p className="mt-1 text-3xl font-extrabold text-cyan-800">{roleCounts.director}</p>
            </article>
            <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Docentes</p>
              <p className="mt-1 text-3xl font-extrabold text-emerald-800">{roleCounts.docente}</p>
            </article>
            <article className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Estudiantes</p>
              <p className="mt-1 text-3xl font-extrabold text-violet-800">{roleCounts.estudiantes}</p>
            </article>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="font-semibold text-gray-800 mb-2">Crear usuario</h2>
          <p className="text-sm text-gray-600 mb-2">
            Desde aqui el admin crea cuentas de tipo docente y director con credenciales de acceso.
          </p>
          <UserForm />
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Asignar materia a docente</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : teachers.length === 0 || subjects.length === 0 ? (
            <p className="text-sm text-gray-600">
              Necesitas al menos un docente y una materia para asignar.
            </p>
          ) : (
            <TeacherSubjectForm teachers={teachers} subjects={subjects} />
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Asignaciones actuales</h2>
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-gray-600">Aun no hay materias asignadas a docentes.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Docente</th>
                    <th className="px-3 py-2">Usuario</th>
                    <th className="px-3 py-2">Materia</th>
                    <th className="px-3 py-2">Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{assignment.teacher?.full_name ?? "-"}</td>
                      <td className="px-3 py-2">{assignment.teacher?.username ?? "-"}</td>
                      <td className="px-3 py-2">{assignment.subject?.name ?? "-"}</td>
                      <td className="px-3 py-2">{assignment.subject?.level ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Gestion de fin de anio</h2>
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-blue-50 p-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-blue-900">Promover curso completo</p>
              <PromoteCourseForm />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-amber-900">Graduar curso completo</p>
              <GraduateCourseForm />
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Editar usuarios del sistema</h2>
          {result.error ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {result.error}
              <p className="mt-1">Configura `.env.local` con las variables de `.env.example`.</p>
            </div>
          ) : (result.data ?? []).length === 0 ? (
            <p className="text-sm text-gray-600">No hay usuarios del sistema para editar.</p>
          ) : (
            <div className="space-y-3">
              {(result.data ?? []).map((user) => (
                <SchoolUserEditForm key={user.id} user={user} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">Editar estudiantes</h2>
          <form className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-blue-50 p-3">
            <label htmlFor="course" className="text-sm font-semibold text-blue-900">
              Curso:
            </label>
            <select
              id="course"
              name="course"
              defaultValue={selectedCourse}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecciona un curso</option>
              {courseOptions.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Ver estudiantes
            </button>
            <Link
              href="/dashboard/usuarios"
              className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Limpiar
            </Link>
          </form>
          {studentsResult.error ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {studentsResult.error}
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-gray-600">Aun no hay estudiantes registrados.</p>
          ) : !selectedCourse ? (
            <p className="text-sm text-gray-600">
              Selecciona primero un curso para ver y editar estudiantes con sus padres/madres.
            </p>
          ) : visibleStudents.length === 0 ? (
            <p className="text-sm text-gray-600">No hay estudiantes en el curso seleccionado.</p>
          ) : (
            <div className="space-y-3">
              {visibleStudents.map((student) => (
                <StudentEditForm
                  key={student.id}
                  student={student}
                  parentNames={parentNamesByStudent.get(student.id) ?? []}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold text-gray-800 mb-2">
            Editar padres/madres {selectedCourse ? `(curso ${selectedCourse})` : ""}
          </h2>
          {parentsResult.error ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {parentsResult.error}
            </div>
          ) : parents.length === 0 ? (
            <p className="text-sm text-gray-600">Aun no hay padres/madres registrados.</p>
          ) : !selectedCourse ? (
            <p className="text-sm text-gray-600">
              Selecciona un curso para listar solo los padres/madres de ese curso.
            </p>
          ) : filteredParents.length === 0 ? (
            <p className="text-sm text-gray-600">No hay padres/madres para el curso seleccionado.</p>
          ) : (
            <div className="space-y-3">
              {filteredParents.map((parent) => (
                <ParentEditForm key={parent.id} parent={parent} />
              ))}
            </div>
          )}
        </section>

        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          Volver
        </Link>
      </main>
    </div>
  );
}
