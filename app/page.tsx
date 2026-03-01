import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_500px_at_20%_-10%,#ffe8a3_0%,transparent_60%),radial-gradient(900px_500px_at_90%_-10%,#bde3ff_0%,transparent_60%),linear-gradient(160deg,#f7fbff_0%,#eef7ff_35%,#f4f8ff_100%)] px-4 py-8 md:px-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_-40px_rgba(16,64,124,0.65)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 shadow-lg shadow-blue-300/60">
                <span className="text-xl font-black text-white">E</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
                  Plataforma Escolar
                </p>
                <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl">Educando</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
              >
                Iniciar sesion
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-3xl bg-slate-900 p-7 text-white shadow-xl md:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Gestion academica inteligente
            </p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">
              Un solo lugar para notas, asistencia y comunicacion con familias.
            </h2>
            <p className="mt-4 max-w-2xl text-slate-200">
              Docentes, direccion, estudiantes y padres conectados en tiempo real con
              notificaciones por Telegram y reportes listos para tomar decisiones.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-sm font-semibold text-cyan-200">
                Calificaciones por curso/materia
              </span>
              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-sm font-semibold text-amber-200">
                Alertas de asistencia
              </span>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-semibold text-emerald-200">
                Vinculacion Telegram
              </span>
            </div>
          </article>

          <article className="grid gap-4 rounded-3xl border border-cyan-100 bg-white p-6 shadow-xl">
            <div className="rounded-2xl bg-cyan-50 p-4">
              <p className="text-sm text-slate-600">Roles activos</p>
              <p className="mt-1 text-2xl font-black text-slate-900">5</p>
              <p className="text-sm text-slate-600">admin, director, docente, estudiante, padre</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-sm text-slate-600">Canales de aviso</p>
              <p className="mt-1 text-2xl font-black text-blue-700">Telegram + Web</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-sm text-slate-600">Estado objetivo</p>
              <p className="mt-1 text-2xl font-black text-amber-700">Tiempo real</p>
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Control Docente",
              text: "Solo ve materias asignadas y estudiantes inscritos en esas materias.",
            },
            {
              title: "Seguimiento Familiar",
              text: "Padres reciben avisos de calificaciones, faltas y reuniones importantes.",
            },
            {
              title: "Decision Directiva",
              text: "Direccion y administracion con reportes para monitorear rendimiento.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-blue-100 bg-white/85 p-5 shadow-[0_12px_30px_-22px_rgba(24,60,120,0.7)]"
            >
              <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
