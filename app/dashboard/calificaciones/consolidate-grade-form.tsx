"use client";

import { useActionState, useMemo, useState } from "react";
import type { EvaluationActivity, Student, Subject, SubjectStudentEnrollment } from "@/lib/db";
import {
  consolidateTrimestralGradeAction,
  type CatalogFormState,
} from "./actions";

const initialState: CatalogFormState = { error: null, success: null };

type Props = {
  students: Student[];
  subjects: Subject[];
  activities: EvaluationActivity[];
  enrollments: SubjectStudentEnrollment[];
};

export function ConsolidateGradeForm({
  students,
  subjects,
  activities,
  enrollments,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    consolidateTrimestralGradeAction,
    initialState
  );
  const [course, setCourse] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");

  const courses = useMemo(
    () => Array.from(new Set(students.map((item) => item.course))).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    if (!course || !subjectId) return [];
    const subjectIdNum = Number.parseInt(subjectId, 10);
    if (!Number.isInteger(subjectIdNum)) return [];
    const allowed = new Set(
      enrollments
        .filter((item) => item.subject_id === subjectIdNum)
        .map((item) => item.student_id)
    );
    return students.filter((item) => item.course === course && allowed.has(item.id));
  }, [students, enrollments, course, subjectId]);

  const terms = useMemo(() => {
    if (!course || !subjectId) return [];
    const subjectIdNum = Number.parseInt(subjectId, 10);
    if (!Number.isInteger(subjectIdNum)) return [];
    return Array.from(
      new Set(
        activities
          .filter((item) => item.subject_id === subjectIdNum && item.course === course)
          .map((item) => item.term)
      )
    ).sort();
  }, [activities, course, subjectId]);

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <select
        className="border border-gray-300 rounded-lg px-3 py-2"
        value={course}
        onChange={(event) => setCourse(event.target.value)}
      >
        <option value="">Curso</option>
        {courses.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <select
        name="subject_id"
        className="border border-gray-300 rounded-lg px-3 py-2"
        value={subjectId}
        onChange={(event) => setSubjectId(event.target.value)}
      >
        <option value="">Materia</option>
        {subjects.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.level})
          </option>
        ))}
      </select>

      <select
        name="student_id"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue=""
        disabled={!course || !subjectId}
      >
        <option value="" disabled>
          {!course || !subjectId ? "Selecciona curso y materia" : "Estudiante"}
        </option>
        {filteredStudents.map((item) => (
          <option key={item.id} value={item.id}>
            {item.full_name}
          </option>
        ))}
      </select>

      <select
        name="term"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue=""
        disabled={!course || !subjectId}
      >
        <option value="" disabled>
          {!course || !subjectId ? "Selecciona curso y materia" : "Periodo/Trimestre"}
        </option>
        {terms.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={isPending}
        className="md:col-span-4 bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-70"
      >
        {isPending ? "Consolidando..." : "Consolidar trimestre y guardar nota final"}
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
