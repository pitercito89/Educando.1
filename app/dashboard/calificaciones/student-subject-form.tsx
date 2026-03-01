"use client";

import { useActionState } from "react";
import type { Student, Subject } from "@/lib/db";
import {
  enrollStudentInSubjectAction,
  type CatalogFormState,
} from "./actions";

const initialState: CatalogFormState = { error: null, success: null };

type StudentSubjectFormProps = {
  students: Student[];
  subjects: Subject[];
};

export function StudentSubjectForm({ students, subjects }: StudentSubjectFormProps) {
  const [state, formAction, isPending] = useActionState(
    enrollStudentInSubjectAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <select
        name="student_id"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue=""
      >
        <option value="" disabled>
          Selecciona estudiante
        </option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.full_name} - {student.course}
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
        {isPending ? "Guardando..." : "Asignar estudiante"}
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
