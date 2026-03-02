import Link from "next/link";

export default function RecuperarCuentaPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_400px_at_10%_-5%,#bde3ff_0%,transparent_60%),radial-gradient(700px_380px_at_95%_-10%,#ffe7ae_0%,transparent_60%),linear-gradient(160deg,#f4f9ff_0%,#eef5ff_42%,#f8fbff_100%)] px-4 py-8">
      <main className="mx-auto w-full max-w-lg rounded-3xl border border-white/80 bg-white/95 p-8 shadow-[0_24px_60px_-35px_rgba(18,55,116,0.65)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
          Plataforma Educando
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Recuperar acceso</h1>
        <p className="mt-3 text-sm text-slate-700">
          Por seguridad, la recuperacion de contrasena se gestiona con administracion del colegio.
          Solicita el restablecimiento indicando tu usuario y rol.
        </p>

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">Flujo recomendado</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Contacta al administrador del sistema.</li>
            <li>Indica tu usuario y nombre completo.</li>
            <li>Recibe tu nueva contrasena temporal.</li>
            <li>Cambiala en &quot;Mi perfil&quot; al ingresar.</li>
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Volver a iniciar sesion
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Ir al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
