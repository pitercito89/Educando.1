import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { type AuditAction, type AuditEntity, listAuditLogs } from "@/lib/db";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? "").trim();
  return (value ?? "").trim();
}

const ENTITY_OPTIONS: AuditEntity[] = [
  "usuarios",
  "calificaciones",
  "asistencias",
  "notificaciones",
];

const ACTION_OPTIONS: AuditAction[] = [
  "crear",
  "actualizar",
  "consolidar",
  "enviar",
  "eliminar",
];

export default async function AuditoriaPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["admin", "director"].includes(session.role)) redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const entity = pickParam(params.entity) as AuditEntity | "";
  const action = pickParam(params.action) as AuditAction | "";
  const actorRole = pickParam(params.actor_role);
  const actorUsername = pickParam(params.actor_username);

  const result = await listAuditLogs({
    limit: 500,
    entity: entity || undefined,
    action: action || undefined,
    actorRole: actorRole || undefined,
    actorUsername: actorUsername || undefined,
  });

  const logs = result.data ?? [];
  const setupError = result.error;

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#eef6ff_0%,#f7fbff_45%,#f3f8ff_100%)] p-4 md:p-8">
      <main className="mx-auto max-w-6xl rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_24px_60px_-36px_rgba(23,66,130,0.65)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          Control Institucional
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Auditoria del sistema</h1>
        <p className="mt-2 text-gray-700">
          Trazabilidad de cambios: quien hizo que, cuando y con que datos.
        </p>

        <section className="mt-5">
          <form className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-blue-50 p-4 md:grid-cols-5">
            <select
              name="entity"
              defaultValue={entity}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas las entidades</option>
              {ENTITY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              name="action"
              defaultValue={action}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas las acciones</option>
              {ACTION_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              name="actor_role"
              defaultValue={actorRole}
              placeholder="Rol (ej: admin)"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />

            <input
              name="actor_username"
              defaultValue={actorUsername}
              placeholder="Usuario actor"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Filtrar
              </button>
              <Link
                href="/dashboard/auditoria"
                className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Limpiar
              </Link>
            </div>
          </form>
        </section>

        <section className="mt-6">
          {setupError ? (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              {setupError}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-600">No hay trazas para los filtros seleccionados.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Actor</th>
                    <th className="px-3 py-2">Rol</th>
                    <th className="px-3 py-2">Entidad</th>
                    <th className="px-3 py-2">Accion</th>
                    <th className="px-3 py-2">ID entidad</th>
                    <th className="px-3 py-2">Detalle despues</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-gray-100 align-top">
                      <td className="px-3 py-2">
                        {new Date(log.created_at).toLocaleString("es-BO")}
                      </td>
                      <td className="px-3 py-2">{log.actor_username}</td>
                      <td className="px-3 py-2">{log.actor_role}</td>
                      <td className="px-3 py-2">{log.entity}</td>
                      <td className="px-3 py-2">{log.action}</td>
                      <td className="px-3 py-2">{log.entity_id ?? "-"}</td>
                      <td className="px-3 py-2 whitespace-pre-wrap break-words max-w-[32rem]">
                        {log.after_data ? JSON.stringify(log.after_data, null, 2) : "-"}
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
          Volver
        </Link>
      </main>
    </div>
  );
}
