"use client";

import { useActionState, useMemo, useState } from "react";
import type { Student, Subject, SubjectStudentEnrollment } from "@/lib/db";
import {
  saveCourseAttendanceAction,
  type AttendanceFormState,
} from "./actions";

const initialState: AttendanceFormState = { error: null, success: null };

type AttendanceFormProps = {
  students: Student[];
  subjects: Subject[];
  enrollments: SubjectStudentEnrollment[];
  defaultDate: string;
  initialCourse?: string;
  initialSubjectId?: string;
};

export function AttendanceForm({
  students,
  subjects,
  enrollments,
  defaultDate,
  initialCourse = "",
  initialSubjectId = "",
}: AttendanceFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveCourseAttendanceAction,
    initialState
  );

  const courses = useMemo(
    () => Array.from(new Set(students.map((student) => student.course))).sort(),
    [students]
  );
  const fallbackCourse = courses[0] ?? "";
  const [selectedCourse, setSelectedCourse] = useState<string>(
    initialCourse || fallbackCourse
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubjectId);
  const lockedContext = Boolean(initialCourse && initialSubjectId);
  const studentsById = useMemo(
    () => new Map(students.map((item) => [item.id, item])),
    [students]
  );

  const subjectOptions = useMemo(() => {
    if (!selectedCourse) return [];
    const allowedIds = new Set(
      enrollments
        .filter((item) => studentsById.get(item.student_id)?.course === selectedCourse)
        .map((item) => item.subject_id)
    );
    return subjects.filter((item) => allowedIds.has(item.id));
  }, [enrollments, selectedCourse, studentsById, subjects]);

  const filteredStudents = useMemo(() => {
    if (!selectedCourse || !selectedSubject) return [];
    const subjectId = Number.parseInt(selectedSubject, 10);
    if (!Number.isInteger(subjectId)) return [];
    const allowedStudentIds = new Set(
      enrollments
        .filter((item) => item.subject_id === subjectId)
        .map((item) => item.student_id)
    );
    return students.filter(
      (student) => student.course === selectedCourse && allowedStudentIds.has(student.id)
    );
  }, [students, selectedCourse, selectedSubject, enrollments]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {lockedContext ? (
          <>
            <input type="hidden" name="course" value={selectedCourse} />
            <input type="hidden" name="subject_id" value={selectedSubject} />
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Curso: <span className="font-semibold">{selectedCourse}</span>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Materia: <span className="font-semibold">{subjectOptions.find((s) => String(s.id) === selectedSubject)?.name ?? "Seleccionada"}</span>
            </div>
          </>
        ) : (
          <>
            <select
              name="course"
              value={selectedCourse}
              onChange={(event) => setSelectedCourse(event.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
            <select
              name="subject_id"
              className="border border-gray-300 rounded-lg px-3 py-2"
              value={selectedSubject}
              onChange={(event) => setSelectedSubject(event.target.value)}
              disabled={!selectedCourse}
            >
              <option value="">
                {!selectedCourse ? "Primero selecciona curso" : "Materia"}
              </option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.level})
                </option>
              ))}
            </select>
          </>
        )}

        <input
          name="attendance_date"
          type="date"
          defaultValue={defaultDate}
          className="border border-gray-300 rounded-lg px-3 py-2"
        />

        <div className="text-xs text-gray-600 flex items-center">
          Marca por alumno: presente, licencia o falta.
        </div>
      </div>

      <input
        type="hidden"
        name="student_ids"
        value={filteredStudents.map((item) => item.id).join(",")}
      />

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">Estudiante</th>
              <th className="px-3 py-2">Presente</th>
              <th className="px-3 py-2">Licencia</th>
              <th className="px-3 py-2">Falta</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id} className="border-t border-gray-100">
                <td className="px-3 py-2">{student.full_name}</td>
                <td className="px-3 py-2">
                  <input
                    type="radio"
                    name={`status_${student.id}`}
                    value="presente"
                    defaultChecked
                  />
                </td>
                <td className="px-3 py-2">
                  <input type="radio" name={`status_${student.id}`} value="licencia" />
                </td>
                <td className="px-3 py-2">
                  <input type="radio" name={`status_${student.id}`} value="falta" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="submit"
        disabled={isPending || !selectedSubject || filteredStudents.length === 0}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-70"
      >
        {isPending ? "Guardando..." : "Guardar asistencia del curso"}
      </button>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-700">{state.success}</p> : null}
    </form>
  );
}
