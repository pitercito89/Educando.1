"use client";

import { useActionState } from "react";
import {
  sendMeetingToParentsAction,
  type ParentMeetingState,
} from "./actions";

const initialState: ParentMeetingState = { error: null, success: null };

type MeetingFormProps = {
  courses: string[];
  requireCourse?: boolean;
};

export function MeetingForm({ courses, requireCourse = false }: MeetingFormProps) {
  const [state, formAction, isPending] = useActionState(
    sendMeetingToParentsAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <input
        name="meeting_title"
        placeholder="Titulo (ej: Reunion mensual)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="meeting_date"
        type="date"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="meeting_time"
        type="time"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <select
        name="course"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue={requireCourse ? "__select__" : ""}
      >
        {!requireCourse ? <option value="">Todos los cursos</option> : null}
        {requireCourse ? (
          <option value="__select__" disabled>
            Selecciona curso
          </option>
        ) : null}
        {courses.map((course) => (
          <option key={course} value={course}>
            {course}
          </option>
        ))}
      </select>

      <textarea
        name="extra_message"
        placeholder="Detalle adicional (opcional)"
        className="md:col-span-3 border border-gray-300 rounded-lg px-3 py-2 min-h-20"
      />
      <button
        type="submit"
        disabled={isPending}
        className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 disabled:opacity-70"
      >
        {isPending ? "Enviando..." : "Enviar aviso a padres"}
      </button>

      {state.error ? (
        <p className="md:col-span-4 text-sm text-red-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="md:col-span-4 text-sm text-green-700">{state.success}</p>
      ) : null}

      {requireCourse ? (
        <p className="md:col-span-4 text-xs text-gray-600">
          Como docente, solo puedes enviar reuniones por curso de tus materias asignadas.
        </p>
      ) : null}
    </form>
  );
}
