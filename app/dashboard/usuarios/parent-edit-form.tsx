"use client";

import { useActionState } from "react";
import type { Parent } from "@/lib/db";
import { type UserUpdateState, updateParentAction } from "./actions";

const initialState: UserUpdateState = { error: null, success: null };

type Props = {
  parent: Parent;
};

export function ParentEditForm({ parent }: Props) {
  const [state, formAction, isPending] = useActionState(
    updateParentAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-8 md:items-center">
      <input type="hidden" name="id" value={parent.id} />
      <div>
        <input
          name="full_name"
          defaultValue={parent.full_name}
          className="w-full rounded-md border border-gray-300 px-2 py-1"
        />
      </div>
      <div>
        <input
          name="username"
          defaultValue={parent.username}
          className="w-full rounded-md border border-gray-300 px-2 py-1"
        />
      </div>
      <div className="text-sm text-gray-700">{parent.student?.full_name ?? "-"}</div>
      <div className="text-sm text-gray-700">{parent.student?.course ?? "-"}</div>
      <div>
        <select
          name="is_active"
          defaultValue={parent.is_active ? "true" : "false"}
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
