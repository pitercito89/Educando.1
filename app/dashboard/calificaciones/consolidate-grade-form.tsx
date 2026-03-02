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
  initialCourse?: string;
  initialSubjectId?: string;
};

export function ConsolidateGradeForm({
  students,
  subjects,
  activities,
  enrollments,
  initialCourse = "",
  initialSubjectId = "",
}: Props) {
  const [state, formAction, isPending] = useActionState(
    consolidateTrimestralGradeAction,
    initialState
  );
  const [course, setCourse] = useState<string>(initialCourse);
  const [subjectId, setSubjectId] = useState<string>(initialSubjectId);
  const lockedContext = Boolean(initialCourse && initialSubjectId);

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

  const filteredSubjects = useMemo(() => {
    if (!course) return [];
    const studentsInCourse = new Set(
      students.filter((item) => item.course === course).map((item) => item.id)
    );
    const allowedSubjectIds = new Set(
      enrollments
        .filter((item) => studentsInCourse.has(item.student_id))
        .map((item) => item.subject_id)
    );
    return subjects.filter((item) => allowedSubjectIds.has(item.id));
  }, [course, enrollments, students, subjects]);

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
      {lockedContext ? (
        <>
          <input type="hidden" name="subject_id" value={subjectId} />
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Curso: <span className="font-semibold">{course}</span>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Materia: <span className="font-semibold">{filteredSubjects.find((s) => String(s.id) === subjectId)?.name ?? "Seleccionada"}</span>
          </div>
        </>
      ) : (
        <>
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
            disabled={!course}
          >
            <option value="">{!course ? "Primero selecciona curso" : "Materia"}</option>
            {filteredSubjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.level})
              </option>
            ))}
          </select>
        </>
      )}

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
