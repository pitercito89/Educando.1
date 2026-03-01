"use client";

import { useActionState, useMemo, useState } from "react";
import type { EvaluationActivity, Student, SubjectStudentEnrollment } from "@/lib/db";
import {
  registerEvaluationScoreAction,
  type CatalogFormState,
} from "./actions";

const initialState: CatalogFormState = { error: null, success: null };

type Props = {
  activities: EvaluationActivity[];
  students: Student[];
  enrollments: SubjectStudentEnrollment[];
};

export function EvaluationScoreForm({ activities, students, enrollments }: Props) {
  const [state, formAction, isPending] = useActionState(
    registerEvaluationScoreAction,
    initialState
  );
  const [activityId, setActivityId] = useState<string>("");

  const selectedActivity = useMemo(
    () => activities.find((item) => String(item.id) === activityId) ?? null,
    [activities, activityId]
  );

  const studentOptions = useMemo(() => {
    if (!selectedActivity) return [];
    const allowed = new Set(
      enrollments
        .filter((item) => item.subject_id === selectedActivity.subject_id)
        .map((item) => item.student_id)
    );
    return students.filter(
      (student) => student.course === selectedActivity.course && allowed.has(student.id)
    );
  }, [selectedActivity, students, enrollments]);

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <select
        name="activity_id"
        className="border border-gray-300 rounded-lg px-3 py-2 md:col-span-2"
        value={activityId}
        onChange={(event) => setActivityId(event.target.value)}
      >
        <option value="">Selecciona actividad evaluativa</option>
        {activities.map((activity) => (
          <option key={activity.id} value={activity.id}>
            {activity.term} | {activity.course} | {activity.subject?.name ?? "Materia"} |{" "}
            {activity.instrument_type} | {activity.dimension} | {activity.title}
          </option>
        ))}
      </select>

      <select
        name="student_id"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue=""
        disabled={!selectedActivity}
      >
        <option value="" disabled>
          {selectedActivity ? "Selecciona estudiante" : "Primero selecciona actividad"}
        </option>
        {studentOptions.map((student) => (
          <option key={student.id} value={student.id}>
            {student.full_name} - {student.course}
          </option>
        ))}
      </select>

      <input
        name="score"
        type="number"
        min={0}
        max={100}
        step="0.01"
        placeholder="Nota (0-100)"
        className="border border-gray-300 rounded-lg px-3 py-2"
      />

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-70 md:col-span-4"
      >
        {isPending ? "Guardando..." : "Registrar nota del instrumento"}
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
