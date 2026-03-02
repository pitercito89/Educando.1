"use client";

import { useActionState, useMemo, useState } from "react";
import type { Student, Subject, SubjectStudentEnrollment } from "@/lib/db";
import {
  createEvaluationActivityAction,
  type CatalogFormState,
} from "./actions";

const initialState: CatalogFormState = { error: null, success: null };

type Props = {
  subjects: Subject[];
  students: Student[];
  enrollments: SubjectStudentEnrollment[];
  initialCourse?: string;
  initialSubjectId?: string;
};

export function EvaluationActivityForm({
  subjects,
  students,
  enrollments,
  initialCourse = "",
  initialSubjectId = "",
}: Props) {
  const [state, formAction, isPending] = useActionState(
    createEvaluationActivityAction,
    initialState
  );
  const [course, setCourse] = useState<string>(initialCourse);
  const [subjectId, setSubjectId] = useState<string>(initialSubjectId);
  const lockedContext = Boolean(initialCourse && initialSubjectId);

  const studentsById = useMemo(
    () => new Map(students.map((item) => [item.id, item])),
    [students]
  );

  const courses = useMemo(
    () => Array.from(new Set(students.map((item) => item.course))).sort(),
    [students]
  );

  const filteredSubjects = useMemo(() => {
    if (!course) return [];
    const allowedSubjectIds = new Set(
      enrollments
        .filter((item) => studentsById.get(item.student_id)?.course === course)
        .map((item) => item.subject_id)
    );
    return subjects.filter((item) => allowedSubjectIds.has(item.id));
  }, [course, enrollments, studentsById, subjects]);

  const selectedSubject = useMemo(
    () => filteredSubjects.find((item) => String(item.id) === subjectId) ?? null,
    [filteredSubjects, subjectId]
  );

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {lockedContext ? (
        <>
          <input type="hidden" name="course" value={course} />
          <input type="hidden" name="subject_id" value={subjectId} />
          <div className="md:col-span-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Curso: <span className="font-semibold">{course}</span>
          </div>
          <div className="md:col-span-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Materia: <span className="font-semibold">{selectedSubject?.name ?? "Seleccionada"}</span>
          </div>
        </>
      ) : (
        <>
          <select
            name="course"
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={course}
            onChange={(event) => {
              setCourse(event.target.value);
              setSubjectId("");
            }}
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
            <option value="" disabled>
              {!course ? "Primero selecciona curso" : "Materia"}
            </option>
            {filteredSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.level})
              </option>
            ))}
          </select>
        </>
      )}
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
