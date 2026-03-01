"use client";

import { useActionState, useMemo, useState } from "react";
import type { Student, Subject, SubjectStudentEnrollment } from "@/lib/db";
import { createGradeAction, type GradeFormState } from "./actions";

const initialState: GradeFormState = { error: null, success: null };

type GradeFormProps = {
  students: Student[];
  subjects: Subject[];
  enrollments: SubjectStudentEnrollment[];
};

export function GradeForm({ students, subjects, enrollments }: GradeFormProps) {
  const [state, formAction, isPending] = useActionState(
    createGradeAction,
    initialState
  );
  const courses = useMemo(
    () => Array.from(new Set(students.map((student) => student.course))).sort(),
    [students]
  );
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const filteredStudents = useMemo(
    () => {
      if (!selectedCourse || !selectedSubjectId) return [];
      const subjectId = Number.parseInt(selectedSubjectId, 10);
      if (!Number.isInteger(subjectId)) return [];

      const allowedStudentIds = new Set(
        enrollments
          .filter((enrollment) => enrollment.subject_id === subjectId)
          .map((enrollment) => enrollment.student_id)
      );

      return students.filter(
        (student) =>
          student.course === selectedCourse && allowedStudentIds.has(student.id)
      );
    },
    [students, enrollments, selectedCourse, selectedSubjectId]
  );

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <select
        name="course_filter"
        className="border border-gray-300 rounded-lg px-3 py-2"
        value={selectedCourse}
        onChange={(event) => {
          setSelectedCourse(event.target.value);
          setSelectedStudentId("");
        }}
      >
        <option value="">Selecciona curso</option>
        {courses.map((course) => (
          <option key={course} value={course}>
            {course}
          </option>
        ))}
      </select>

      <select
        name="student_id"
        className="border border-gray-300 rounded-lg px-3 py-2"
        value={selectedStudentId}
        onChange={(event) => setSelectedStudentId(event.target.value)}
        disabled={!selectedCourse || !selectedSubjectId}
      >
        <option value="" disabled>
          {selectedCourse && selectedSubjectId
            ? "Selecciona estudiante del curso y materia"
            : "Primero selecciona curso y materia"}
        </option>
        {filteredStudents.map((student) => (
          <option key={student.id} value={student.id}>
            {student.full_name} - {student.course}
          </option>
        ))}
      </select>

      <select
        name="subject_id"
        className="border border-gray-300 rounded-lg px-3 py-2"
        value={selectedSubjectId}
        onChange={(event) => {
          setSelectedSubjectId(event.target.value);
          setSelectedStudentId("");
        }}
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

      <input
        name="term"
        placeholder="Periodo (ej: 1B-2026)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <div className="text-xs text-gray-600 flex items-center">
        El docente solo puede calificar alumnos de sus cursos/materias asignadas.
      </div>

      <input
        name="saber"
        type="number"
        min={0}
        max={100}
        step="0.01"
        placeholder="Saber"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="hacer"
        type="number"
        min={0}
        max={100}
        step="0.01"
        placeholder="Hacer"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="ser"
        type="number"
        min={0}
        max={100}
        step="0.01"
        placeholder="Ser"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />
      <input
        name="decidir"
        type="number"
        min={0}
        max={100}
        step="0.01"
        placeholder="Decidir"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />

      <button
        type="submit"
        disabled={isPending || !selectedCourse || !selectedSubjectId || !selectedStudentId}
        className="md:col-span-4 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-70"
      >
        {isPending ? "Guardando..." : "Registrar calificacion"}
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
