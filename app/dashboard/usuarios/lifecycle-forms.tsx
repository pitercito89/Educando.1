"use client";

import { useActionState } from "react";
import {
  type LifecycleState,
  graduateCourseAction,
  promoteCourseAction,
} from "./actions";

const initialState: LifecycleState = { error: null, success: null };

export function PromoteCourseForm() {
  const [state, formAction, isPending] = useActionState(
    promoteCourseAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <input
        name="from_course"
        placeholder="Curso actual (ej: 5to A)"
        className="rounded-lg border border-gray-300 px-3 py-2"
      />
      <input
        name="to_course"
        placeholder="Nuevo curso (ej: 6to A)"
        className="rounded-lg border border-gray-300 px-3 py-2"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
      >
        {isPending ? "Aplicando..." : "Promover curso"}
      </button>
      <div className="text-xs text-gray-600">Actualiza todos los estudiantes del curso.</div>
      {state.error ? <p className="text-sm text-red-600 md:col-span-4">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-green-700 md:col-span-4">{state.success}</p>
      ) : null}
    </form>
  );
}

export function GraduateCourseForm() {
  const [state, formAction, isPending] = useActionState(
    graduateCourseAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <input
        name="from_course"
        placeholder="Curso a graduar (ej: 6to A)"
        className="rounded-lg border border-gray-300 px-3 py-2"
      />
      <input
        name="graduation_year"
        placeholder="Gestion (ej: 2026)"
        className="rounded-lg border border-gray-300 px-3 py-2"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-70"
      >
        {isPending ? "Aplicando..." : "Graduar curso"}
      </button>
      <div className="text-xs text-gray-600">
        Marca como graduados e inactivos para el siguiente año.
      </div>
      {state.error ? <p className="text-sm text-red-600 md:col-span-4">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-green-700 md:col-span-4">{state.success}</p>
      ) : null}
    </form>
  );
}

