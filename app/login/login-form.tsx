"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  return (
    <form className="space-y-4" action={formAction}>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="username">
          Usuario
        </label>
        <div className="group flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="mr-2 h-5 w-5 text-slate-500 group-focus-within:text-blue-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="admin"
            autoComplete="username"
            disabled={isPending}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                passwordRef.current?.focus();
              }
            }}
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
          Contrasena
        </label>
        <div className="group flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="mr-2 h-5 w-5 text-slate-500 group-focus-within:text-blue-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 1 1 8 0v3" />
          </svg>
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="********"
            autoComplete="current-password"
            disabled={isPending}
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="ml-2 rounded-md px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
            aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Ingresando..." : "Entrar"}
      </button>

      <div className="pt-1 text-right">
        <Link
          href="/login/recuperar"
          className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 hover:underline"
        >
          Olvidaste tu contrasena?
        </Link>
      </div>
    </form>
  );
}
