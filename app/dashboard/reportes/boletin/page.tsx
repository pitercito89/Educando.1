import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listGradeRecords, listStudents, listSubjectStudentEnrollments } from "@/lib/db";
import { qualitativePerformance } from "@/lib/grade-utils";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? "").trim();
  return (value ?? "").trim();
}

export default async function BoletinPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["admin", "director"].includes(session.role)) redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const selectedStudentId = Number.parseInt(pickParam(params.student_id), 10);
  const selectedTerm = pickParam(params.term);

  const [studentsResult, gradesResult, enrollmentsResult] = await Promise.all([
    listStudents(),
    listGradeRecords({ limit: 4000 }),
    listSubjectStudentEnrollments(),
  ]);

  const setupError = studentsResult.error ?? gradesResult.error ?? enrollmentsResult.error;
  const students = studentsResult.data ?? [];
  const allGrades = gradesResult.data ?? [];
  const enrollments = enrollmentsResult.data ?? [];

  const termOptions = Array.from(new Set(allGrades.map((item) => item.term))).sort();

  const bulletinRows = allGrades.filter((item) => {
    const byStudent = Number.isInteger(selectedStudentId)
      ? item.student_id === selectedStudentId
      : false;
    const byTerm = selectedTerm ? item.term === selectedTerm : false;
    return byStudent && byTerm;
  });

  const selectedStudent = students.find((item) => item.id === selectedStudentId) ?? null;

  const enrolledSubjects = enrollments
    .filter((item) => Number.isInteger(selectedStudentId) && item.student_id === selectedStudentId)
    .map((item) => item.subject)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const pendingSubjects = enrolledSubjects.filter(
    (subject) => !bulletinRows.some((row) => row.subject.id === subject.id)
  );

  const average =
    bulletinRows.length > 0
      ? bulletinRows.reduce((acc, row) => acc + row.total, 0) / bulletinRows.length
      : 0;

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#eef6ff_0%,#f7fbff_45%,#f3f8ff_100%)] p-4 md:p-8">
      <main className="mx-auto max-w-5xl rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_-36px_rgba(23,66,130,0.65)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Reporte Formal
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Boletin trimestral</h1>
        <p className="mt-2 text-gray-700">
          Genera un boletin por estudiante con todas las materias del trimestre seleccionado.
        </p>

        <section className="mt-5">
          <form className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-indigo-50 p-4 md:grid-cols-4">
            <select
              name="student_id"
              defaultValue={Number.isInteger(selectedStudentId) ? String(selectedStudentId) : ""}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecciona estudiante</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} - {student.course}
                </option>
              ))}
            </select>

            <select
              name="term"
              defaultValue={selectedTerm}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecciona trimestre/periodo</option>
              {termOptions.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Generar boletin
            </button>

            <Link
              href="/dashboard/reportes/boletin"
              className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              Limpiar
            </Link>
          </form>
        </section>

        <section className="mt-6">
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : !Number.isInteger(selectedStudentId) || !selectedTerm ? (
            <p className="text-sm text-gray-600">
              Selecciona estudiante y trimestre para generar el boletin.
            </p>
          ) : bulletinRows.length === 0 && pendingSubjects.length === 0 ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              No hay calificaciones para ese estudiante en el periodo seleccionado.
            </div>
          ) : (
            <article className="rounded-2xl border border-gray-200 bg-white">
              <header className="border-b border-gray-200 bg-slate-50 px-5 py-4">
                <h2 className="text-xl font-bold text-slate-900">UNIDAD EDUCATIVA EDUCANDO</h2>
                <p className="text-sm text-gray-600">Boletin de calificaciones trimestral</p>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-3">
                  <p>
                    <span className="font-semibold">Estudiante:</span> {selectedStudent?.full_name ?? "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Curso:</span> {selectedStudent?.course ?? "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Periodo:</span> {selectedTerm}
                  </p>
                </div>
              </header>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-indigo-50 text-left">
                    <tr>
                      <th className="px-3 py-2">Materia</th>
                      <th className="px-3 py-2">Saber</th>
                      <th className="px-3 py-2">Hacer</th>
                      <th className="px-3 py-2">Ser</th>
                      <th className="px-3 py-2">Decidir</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2">Desempeno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulletinRows.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">{row.subject.name}</td>
                        <td className="px-3 py-2">{row.saber.toFixed(2)}</td>
                        <td className="px-3 py-2">{row.hacer.toFixed(2)}</td>
                        <td className="px-3 py-2">{row.ser.toFixed(2)}</td>
                        <td className="px-3 py-2">{row.decidir.toFixed(2)}</td>
                        <td className="px-3 py-2 font-semibold">{row.total.toFixed(2)}</td>
                        <td className="px-3 py-2">{qualitativePerformance(row.total)}</td>
                      </tr>
                    ))}
                    {pendingSubjects.map((subject) => (
                      <tr key={`pending-${subject.id}`} className="border-t border-gray-100 bg-amber-50/50">
                        <td className="px-3 py-2">{subject.name}</td>
                        <td className="px-3 py-2 text-gray-500">-</td>
                        <td className="px-3 py-2 text-gray-500">-</td>
                        <td className="px-3 py-2 text-gray-500">-</td>
                        <td className="px-3 py-2 text-gray-500">-</td>
                        <td className="px-3 py-2 font-semibold text-amber-700">Pendiente</td>
                        <td className="px-3 py-2 text-amber-700">Sin consolidar</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <footer className="grid grid-cols-1 gap-3 border-t border-gray-200 bg-slate-50 px-5 py-4 md:grid-cols-3">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Promedio general:</span> {average.toFixed(2)}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Desempeno global:</span> {qualitativePerformance(average)}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Fecha:</span>{" "}
                  {new Date().toLocaleDateString("es-BO")}
                </p>
              </footer>
            </article>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-blue-50 p-4">
          <h3 className="text-sm font-bold text-blue-800">Como carga notas el docente</h3>
          <p className="mt-1 text-sm text-gray-700">
            En el sistema actual, cada registro representa la nota consolidada de una materia en un
            trimestre. Para llegar a esa nota, el docente puede usar sus instrumentos (examen,
            practico, tareas, proyecto) y luego cargar el promedio final en Saber, Hacer, Ser y
            Decidir.
          </p>
        </section>

        <Link
          href="/dashboard/reportes"
          className="mt-6 inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          Volver a reportes
        </Link>
      </main>
    </div>
  );
}
