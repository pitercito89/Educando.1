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
  initialCourse?: string;
  initialSubjectId?: string;
};

export function EvaluationScoreForm({
  activities,
  students,
  enrollments,
  initialCourse = "",
  initialSubjectId = "",
}: Props) {
  const [state, formAction, isPending] = useActionState(
    registerEvaluationScoreAction,
    initialState
  );
  const [course, setCourse] = useState<string>(initialCourse);
  const [subjectId, setSubjectId] = useState<string>(initialSubjectId);
  const [activityId, setActivityId] = useState<string>("");
  const lockedContext = Boolean(initialCourse && initialSubjectId);

  const courses = useMemo(
    () => Array.from(new Set(activities.map((item) => item.course))).sort(),
    [activities]
  );
  const subjects = useMemo(() => {
    const source = course
      ? activities.filter((item) => item.course === course)
      : activities;
    return Array.from(
      new Map(
        source.map((item) => [
          item.subject_id,
          { id: item.subject_id, label: item.subject?.name ?? `Materia ${item.subject_id}` },
        ])
      ).values()
    ).sort((a, b) => a.label.localeCompare(b.label));
  }, [activities, course]);
  const filteredActivities = useMemo(
    () =>
      activities.filter((item) => {
        const byCourse = course ? item.course === course : true;
        const bySubject = subjectId ? String(item.subject_id) === subjectId : true;
        return byCourse && bySubject;
      }),
    [activities, course, subjectId]
  );

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
      {lockedContext ? (
        <>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Curso: <span className="font-semibold">{course}</span>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Materia: <span className="font-semibold">{subjects.find((s) => String(s.id) === subjectId)?.label ?? "Seleccionada"}</span>
          </div>
        </>
      ) : (
        <>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={course}
            onChange={(event) => {
              setCourse(event.target.value);
              setActivityId("");
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
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setActivityId("");
            }}
          >
            <option value="">Materia</option>
            {subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </>
      )}
      <select
        name="activity_id"
        className="border border-gray-300 rounded-lg px-3 py-2 md:col-span-2"
        value={activityId}
        onChange={(event) => setActivityId(event.target.value)}
        disabled={!course || !subjectId}
      >
        <option value="">Selecciona actividad evaluativa</option>
        {filteredActivities.map((activity) => (
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
          {selectedActivity
            ? "Selecciona estudiante"
            : "Primero selecciona curso, materia y actividad"}
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
