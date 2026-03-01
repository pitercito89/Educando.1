"use client";

import { useActionState } from "react";
import type { Student } from "@/lib/db";
import {
  sendNotificationAction,
  type NotificationFormState,
} from "./actions";

const initialState: NotificationFormState = { error: null, success: null };

type NotificationFormProps = {
  students: Student[];
  allowGeneral?: boolean;
  eventTypes?: string[];
  readOnlyStatus?: boolean;
};

export function NotificationForm({
  students,
  allowGeneral = true,
  eventTypes,
  readOnlyStatus = false,
}: NotificationFormProps) {
  const [state, formAction, isPending] = useActionState(
    sendNotificationAction,
    initialState
  );

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <select
        name="student_id"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue=""
      >
        {allowGeneral ? <option value="">General (sin estudiante)</option> : null}
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.full_name} - {student.course}
          </option>
        ))}
      </select>

      {eventTypes && eventTypes.length > 0 ? (
        <select
          name="event_type"
          className="border border-gray-300 rounded-lg px-3 py-2"
          defaultValue={eventTypes[0]}
        >
          {eventTypes.map((eventType) => (
            <option key={eventType} value={eventType}>
              {eventType}
            </option>
          ))}
        </select>
      ) : (
        <input
          name="event_type"
          placeholder="Evento (ej: alerta_asistencia)"
          className="border border-gray-300 rounded-lg px-3 py-2"
        />
      )}

      <select
        name="channel"
        className="border border-gray-300 rounded-lg px-3 py-2"
        defaultValue="telegram"
      >
        <option value="telegram">telegram</option>
        <option value="interno">interno</option>
      </select>

      {readOnlyStatus ? (
        <>
          <input type="hidden" name="status" value="enviado" />
          <input
            value="enviado (automatico)"
            readOnly
            className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
          />
        </>
      ) : (
        <select
          name="status"
          className="border border-gray-300 rounded-lg px-3 py-2"
          defaultValue="enviado"
        >
          <option value="enviado">enviado</option>
          <option value="pendiente">pendiente</option>
          <option value="error">error</option>
        </select>
      )}

      <textarea
        name="message"
        placeholder="Mensaje a registrar"
        className="md:col-span-3 border border-gray-300 rounded-lg px-3 py-2 min-h-24"
      />

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-70"
      >
        {isPending ? "Registrando..." : "Registrar notificacion"}
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
