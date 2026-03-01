"use client";

import { useActionState } from "react";
import type { Subject } from "@/lib/db";
import {
  createEvaluationActivityAction,
  type CatalogFormState,
} from "./actions";

const initialState: CatalogFormState = { error: null, success: null };

type Props = {
  subjects: Subject[];
};

export function EvaluationActivityForm({ subjects }: Props) {
  const [state, formAction, isPending] = useActionState(
    createEvaluationActivityAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <select
        name="subject_id"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue=""
      >
        <option value="" disabled>
          Materia
        </option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name} ({subject.level})
          </option>
        ))}
      </select>

      <input
        name="course"
        placeholder="Curso (ej: 6to A)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="term"
        placeholder="Periodo (ej: 1T-2026)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="title"
        placeholder="Titulo (ej: Examen parcial 1)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />

      <select
        name="dimension"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue=""
      >
        <option value="" disabled>
          Dimension
        </option>
        <option value="saber">Saber</option>
        <option value="hacer">Hacer</option>
        <option value="ser">Ser</option>
        <option value="decidir">Decidir</option>
      </select>

      <select
        name="instrument_type"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue=""
      >
        <option value="" disabled>
          Tipo de instrumento
        </option>
        <option value="examen">Examen</option>
        <option value="practico">Practico</option>
        <option value="tarea">Tarea</option>
        <option value="proyecto">Proyecto</option>
        <option value="participacion">Participacion</option>
        <option value="otro">Otro</option>
      </select>

      <input
        name="weight"
        type="number"
        min={0.01}
        max={100}
        step="0.01"
        placeholder="Peso (ej: 30)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-70"
      >
        {isPending ? "Guardando..." : "Crear actividad"}
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
