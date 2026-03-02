"use client";

import { useActionState } from "react";
import { changeOwnPasswordAction, type PasswordFormState } from "./actions";

const initialState: PasswordFormState = { error: null, success: null };

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changeOwnPasswordAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <input
        name="current_password"
        type="password"
        placeholder="Contrasena actual"
        className="rounded-lg border border-gray-300 px-3 py-2"
      />
      <div />
      <input
        name="new_password"
        type="password"
        placeholder="Nueva contrasena"
        className="rounded-lg border border-gray-300 px-3 py-2"
      />
      <input
        name="confirm_password"
        type="password"
        placeholder="Confirmar nueva contrasena"
        className="rounded-lg border border-gray-300 px-3 py-2"
      />

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70 md:col-span-2"
      >
        {isPending ? "Actualizando..." : "Cambiar contrasena"}
      </button>

      {state.error ? (
        <p className="text-sm text-red-600 md:col-span-2">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-700 md:col-span-2">{state.success}</p>
      ) : null}
    </form>
  );
}

