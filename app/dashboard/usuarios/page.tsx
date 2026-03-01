import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  listSchoolUsers,
  listSubjects,
  listTeacherSubjectAssignments,
} from "@/lib/db";
import { UserForm } from "./user-form";
import { TeacherSubjectForm } from "./teacher-subject-form";

export default async function UsuariosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");
  const [usersResult, subjectsResult, assignmentsResult] = await Promise.all([
    listSchoolUsers(),
    listSubjects(),
    listTeacherSubjectAssignments(),
  ]);

  const result = usersResult;
  const subjects = subjectsResult.data ?? [];
  const assignments = assignmentsResult.data ?? [];
  const teachers = (usersResult.data ?? []).filter((user) => user.role === "docente");
  const setupError =
    usersResult.error ?? subjectsResult.error ?? assignmentsResult.error;

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
          <h2 className="font-semibold text-gray-800 mb-2">Usuarios registrados</h2>
          {result.error ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {result.error}
              <p className="mt-1">Configura `.env.local` con las variables de `.env.example`.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Usuario</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Rol</th>
                    <th className="px-3 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.data ?? []).map((user) => (
                    <tr key={user.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{user.username}</td>
                      <td className="px-3 py-2">{user.full_name}</td>
                      <td className="px-3 py-2">{user.role}</td>
                      <td className="px-3 py-2">
                        {new Date(user.created_at).toLocaleString("es-BO")}
                      </td>
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
