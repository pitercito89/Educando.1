"use client";

import { useActionState, useMemo, useState } from "react";
import type { EvaluationActivity, Student, SubjectStudentEnrollment } from "@/lib/db";
import {
  bulkRegisterEvaluationScoresAction,
  type CatalogFormState,
} from "./actions";

const initialState: CatalogFormState = { error: null, success: null };

type Props = {
  activities: EvaluationActivity[];
  students: Student[];
  enrollments: SubjectStudentEnrollment[];
};

export function BulkEvaluationScoreForm({ activities, students, enrollments }: Props) {
  const [state, formAction, isPending] = useActionState(
    bulkRegisterEvaluationScoresAction,
    initialState
  );
  const [activityId, setActivityId] = useState<string>("");

  const selectedActivity = useMemo(
    () => activities.find((item) => String(item.id) === activityId) ?? null,
    [activities, activityId]
  );

  const studentRows = useMemo(() => {
    if (!selectedActivity) return [];
    const allowedIds = new Set(
      enrollments
        .filter((row) => row.subject_id === selectedActivity.subject_id)
        .map((row) => row.student_id)
    );
    return students
      .filter(
        (student) => student.course === selectedActivity.course && allowedIds.has(student.id)
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [selectedActivity, enrollments, students]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          name="activity_id"
          className="border border-gray-300 rounded-lg px-3 py-2 md:col-span-2"
          value={activityId}
          onChange={(event) => setActivityId(event.target.value)}
        >
          <option value="">Selecciona actividad para cargar planilla</option>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.term} | {activity.course} | {activity.subject?.name ?? "Materia"} |{" "}
              {activity.instrument_type} | {activity.dimension} | {activity.title}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={isPending || !selectedActivity}
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-70"
        >
          {isPending ? "Guardando planilla..." : "Guardar planilla completa"}
        </button>
      </div>

      {!selectedActivity ? (
        <p className="text-sm text-gray-600">
          Selecciona una actividad para mostrar la planilla del curso.
        </p>
      ) : studentRows.length === 0 ? (
        <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
          No hay estudiantes inscritos para esta actividad.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50 text-left">
              <tr>
                <th className="px-3 py-2">Nro</th>
                <th className="px-3 py-2">Estudiante</th>
                <th className="px-3 py-2">Curso</th>
                <th className="px-3 py-2">Nota (0-100)</th>
              </tr>
            </thead>
            <tbody>
              {studentRows.map((student, index) => (
                <tr key={student.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{index + 1}</td>
                  <td className="px-3 py-2">{student.full_name}</td>
                  <td className="px-3 py-2">{student.course}</td>
                  <td className="px-3 py-2">
                    <input
                      name={`score_${student.id}`}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      className="w-32 rounded-lg border border-gray-300 px-2 py-1"
                      placeholder="Ej: 78"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-700">{state.success}</p> : null}
    </form>
  );
}
