"use client";

import { useActionState } from "react";
import type { Student } from "@/lib/db";
import { type UserUpdateState, updateStudentAction } from "./actions";

const initialState: UserUpdateState = { error: null, success: null };

type Props = {
  student: Student;
  parentNames?: string[];
};

export function StudentEditForm({ student, parentNames = [] }: Props) {
  const [state, formAction, isPending] = useActionState(
    updateStudentAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-9 md:items-center">
      <input type="hidden" name="id" value={student.id} />
      <div>
        <input
          name="full_name"
          defaultValue={student.full_name}
          className="w-full rounded-md border border-gray-300 px-2 py-1"
        />
      </div>
      <div>
        <input
          name="course"
          defaultValue={student.course}
          className="w-full rounded-md border border-gray-300 px-2 py-1"
        />
      </div>
      <div>
        <select
          name="academic_status"
          defaultValue={student.academic_status}
          className="rounded-md border border-gray-300 px-2 py-1"
        >
          <option value="activo">activo</option>
          <option value="graduado">graduado</option>
          <option value="retirado">retirado</option>
        </select>
      </div>
      <div>
        <input
          name="username"
          defaultValue={student.username ?? ""}
          className="w-full rounded-md border border-gray-300 px-2 py-1"
        />
      </div>
      <div className="text-xs text-gray-700">
        {parentNames.length > 0 ? parentNames.join(", ") : "Sin padre/madre"}
      </div>
      <div>
        <select
          name="is_active"
          defaultValue={student.is_active ? "true" : "false"}
          className="rounded-md border border-gray-300 px-2 py-1"
        >
          <option value="true">activo</option>
          <option value="false">inactivo</option>
        </select>
      </div>
      <div>
        <input
          name="new_password"
          type="password"
          placeholder="nueva contrasena (opcional)"
          className="w-full rounded-md border border-gray-300 px-2 py-1"
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 disabled:opacity-70"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
      <div className="text-xs">
        {state.error ? (
          <span className="text-red-600">{state.error}</span>
        ) : state.success ? (
          <span className="text-green-700">{state.success}</span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </div>
    </form>
  );
}
