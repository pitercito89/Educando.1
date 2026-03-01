"use client";

import { useActionState } from "react";
import type { TelegramCodeState } from "./telegram-actions";

type TelegramLinkBoxProps = {
  title: string;
  description: string;
  botUsername: string;
  existingCode: string | null | undefined;
  existingChatId: string | null | undefined;
  action: (
    prevState: TelegramCodeState
  ) => Promise<TelegramCodeState>;
};

const initialState: TelegramCodeState = { error: null, success: null, code: null };

export function TelegramLinkBox(props: TelegramLinkBoxProps) {
  const [state, formAction, isPending] = useActionState(props.action, initialState);
  const code = state.code ?? props.existingCode;
  const startLink = code
    ? `https://t.me/${props.botUsername}?start=${encodeURIComponent(code)}`
    : `https://t.me/${props.botUsername}`;

  return (
    <section className="mt-6 bg-white rounded-xl shadow p-5">
      <h2 className="text-lg font-semibold text-blue-700">{props.title}</h2>
      <p className="text-sm text-gray-600 mt-1">{props.description}</p>

      <div className="mt-3 text-sm text-gray-700">
        <p>
          Bot: <span className="font-semibold">@{props.botUsername}</span>
        </p>
        <p>
          Estado:{" "}
          <span className={props.existingChatId ? "text-green-700 font-semibold" : "text-yellow-700 font-semibold"}>
            {props.existingChatId ? "Vinculado" : "Pendiente de vinculacion"}
          </span>
        </p>
      </div>

      <form action={formAction} className="mt-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-70"
        >
          {isPending ? "Generando..." : "Generar codigo de vinculacion"}
        </button>
      </form>

      {code ? (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
          <p className="font-semibold">Codigo actual:</p>
          <p className="font-mono">{code}</p>
          <div className="mt-2 space-y-1 text-gray-700">
            <p className="font-semibold">Donde poner el codigo:</p>
            <p>1. Abre el chat del bot @{props.botUsername}.</p>
            <p>
              2. Envia este comando: <span className="font-mono">/start {code}</span>
            </p>
          </div>
          <a
            href={startLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Abrir Telegram con codigo
          </a>
        </div>
      ) : null}

      {!code ? (
        <p className="mt-3 text-xs text-gray-600">
          Genera el codigo y luego abre Telegram para enviar <span className="font-mono">/start CODIGO</span>.
        </p>
      ) : null}

      {state.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="mt-2 text-sm text-green-700">{state.success}</p> : null}
    </section>
  );
}
