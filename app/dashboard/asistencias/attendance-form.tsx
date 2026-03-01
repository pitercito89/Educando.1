"use client";

import { useActionState, useMemo, useState } from "react";
import type { Student } from "@/lib/db";
import {
  saveCourseAttendanceAction,
  type AttendanceFormState,
} from "./actions";

const initialState: AttendanceFormState = { error: null, success: null };

type AttendanceFormProps = {
  students: Student[];
  defaultDate: string;
};

export function AttendanceForm({ students, defaultDate }: AttendanceFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveCourseAttendanceAction,
    initialState
  );

  const courses = useMemo(
    () => Array.from(new Set(students.map((student) => student.course))).sort(),
    [students]
  );
  const [selectedCourse, setSelectedCourse] = useState<string>(courses[0] ?? "");
  const filteredStudents = useMemo(
    () => students.filter((student) => student.course === selectedCourse),
    [students, selectedCourse]
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
        disabled={isPending || filteredStudents.length === 0}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-70"
      >
        {isPending ? "Guardando..." : "Guardar asistencia del curso"}
      </button>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-700">{state.success}</p> : null}
    </form>
  );
}
