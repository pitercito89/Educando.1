"use client";

import { useActionState } from "react";
import { createStudentAction, type CatalogFormState } from "./actions";

const initialState: CatalogFormState = { error: null, success: null };

export function StudentForm() {
  const [state, formAction, isPending] = useActionState(
    createStudentAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <input
        name="full_name"
        placeholder="Nombre completo"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="course"
        placeholder="Curso (ej: 5to A)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="username"
        placeholder="Usuario estudiante"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="password"
        type="password"
        placeholder="Contrasena estudiante"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="guardian_chat_id"
        placeholder="Telegram chat id (opcional)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <div />
      <input
        name="parent_full_name"
        placeholder="Nombre del padre/madre (opcional)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="parent_username"
        placeholder="Usuario padre/madre (opcional)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="parent_password"
        type="password"
        placeholder="Contrasena padre/madre (opcional)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-70"
      >
        {isPending ? "Guardando..." : "Crear estudiante"}
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
