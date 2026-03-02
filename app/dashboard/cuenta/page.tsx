import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PasswordForm } from "./password-form";
import { getParentById, getStudentById, listSchoolUsers } from "@/lib/db";

export default async function CuentaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isStaff =
    session.role === "admin" || session.role === "docente" || session.role === "director";
  const schoolUsersResult = isStaff ? await listSchoolUsers() : null;
  const schoolUser = isStaff
    ? (schoolUsersResult?.data ?? []).find((item) => item.id === session.schoolUserId) ?? null
    : null;
  const studentResult = session.role === "estudiante" && session.studentId
    ? await getStudentById(session.studentId)
    : null;
  const parentResult = session.role === "padre" && session.parentId
    ? await getParentById(session.parentId)
    : null;

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#eef6ff_0%,#f7fbff_45%,#eef8ff_100%)] p-4 md:p-8">
      <main className="mx-auto max-w-3xl rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_-36px_rgba(23,66,130,0.65)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Seguridad</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Mi cuenta</h1>
        <p className="mt-2 text-gray-700">
          Usuario: <span className="font-semibold">{session.username}</span> | Rol:{" "}
          <span className="font-semibold">{session.role}</span>
        </p>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Datos del perfil</h2>
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
            <p>
              <span className="font-semibold">Nombre completo:</span>{" "}
              {schoolUser?.full_name ??
                studentResult?.data?.full_name ??
                parentResult?.data?.full_name ??
                session.fullName}
            </p>
            <p>
              <span className="font-semibold">Usuario:</span> {session.username}
            </p>
            <p>
              <span className="font-semibold">Rol:</span> {session.role}
            </p>
            {schoolUser ? (
              <p>
                <span className="font-semibold">Fecha de registro:</span>{" "}
                {new Date(schoolUser.created_at).toLocaleString("es-BO")}
              </p>
            ) : null}
            {studentResult?.data ? (
              <>
                <p>
                  <span className="font-semibold">Curso:</span> {studentResult.data.course}
                </p>
                <p>
                  <span className="font-semibold">Telegram:</span>{" "}
                  {studentResult.data.telegram_chat_id ? "Vinculado" : "No vinculado"}
                </p>
              </>
            ) : null}
            {parentResult?.data ? (
              <>
                <p>
                  <span className="font-semibold">Estudiante vinculado:</span>{" "}
                  {parentResult.data.student?.full_name ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Curso del estudiante:</span>{" "}
                  {parentResult.data.student?.course ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Telegram:</span>{" "}
                  {parentResult.data.telegram_chat_id ? "Vinculado" : "No vinculado"}
                </p>
              </>
            ) : null}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-blue-50 p-4">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Cambiar contrasena</h2>
          <p className="mb-3 text-sm text-gray-600">
            Para seguridad, primero confirma tu contrasena actual.
          </p>
          <PasswordForm />
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
