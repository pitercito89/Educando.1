import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_400px_at_10%_-5%,#bde3ff_0%,transparent_60%),radial-gradient(700px_380px_at_95%_-10%,#ffe7ae_0%,transparent_60%),linear-gradient(160deg,#f4f9ff_0%,#eef5ff_42%,#f8fbff_100%)] px-4 py-8">
      <main className="mx-auto w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-8 shadow-[0_24px_60px_-35px_rgba(18,55,116,0.65)] backdrop-blur transition-transform duration-300 hover:-translate-y-0.5">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
            Plataforma Educando
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Iniciar Sesion</h1>
        </div>

        <LoginForm />

        <div className="mt-5 text-center">
          <Link
            href="/"
            className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
