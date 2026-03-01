"use client";

import { useActionState } from "react";
import { createUserAction, type UserFormState } from "./actions";

const initialState: UserFormState = { error: null, success: null };

export function UserForm() {
  const [state, formAction, isPending] = useActionState(
    createUserAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <input
        name="username"
        placeholder="usuario"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="full_name"
        placeholder="nombre completo"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="password"
        type="password"
        placeholder="contrasena"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <select name="role" className="border border-gray-300 rounded-lg px-3 py-2">
        <option value="docente">docente</option>
        <option value="director">director</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-70"
      >
        {isPending ? "Guardando..." : "Crear usuario"}
      </button>

      {state.error ? (
        <p className="md:col-span-4 text-sm text-red-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="md:col-span-4 text-sm text-green-700">{state.success}</p>
      ) : null}
    </form>
  );
}
