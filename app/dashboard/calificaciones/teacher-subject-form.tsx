"use client";

import { useActionState } from "react";
import type { SchoolUser, Subject } from "@/lib/db";
import {
  assignTeacherToSubjectAction,
  type CatalogFormState,
} from "./actions";

const initialState: CatalogFormState = { error: null, success: null };

type TeacherSubjectFormProps = {
  teachers: SchoolUser[];
  subjects: Subject[];
};

export function TeacherSubjectForm({ teachers, subjects }: TeacherSubjectFormProps) {
  const [state, formAction, isPending] = useActionState(
    assignTeacherToSubjectAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <select
        name="teacher_user_id"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue=""
      >
        <option value="" disabled>
          Selecciona docente
        </option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.full_name} ({teacher.username})
          </option>
        ))}
      </select>

      <select
        name="subject_id"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue=""
      >
        <option value="" disabled>
          Selecciona materia
        </option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name} ({subject.level})
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-70"
      >
        {isPending ? "Guardando..." : "Asignar docente"}
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
