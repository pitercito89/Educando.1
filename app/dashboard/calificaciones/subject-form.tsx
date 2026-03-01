"use client";

import { useActionState } from "react";
import { createSubjectAction, type CatalogFormState } from "./actions";

const initialState: CatalogFormState = { error: null, success: null };

export function SubjectForm() {
  const [state, formAction, isPending] = useActionState(
    createSubjectAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <input
        name="name"
        placeholder="Materia (ej: Matematicas)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="level"
        placeholder="Nivel (ej: Secundaria)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-70"
      >
        {isPending ? "Guardando..." : "Crear materia"}
      </button>

      {state.error ? (
        <p className="md:col-span-3 text-sm text-red-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="md:col-span-3 text-sm text-green-700">{state.success}</p>
      ) : null}
    </form>
  );
}
