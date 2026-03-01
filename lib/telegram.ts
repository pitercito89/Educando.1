type TelegramSendResult = {
  ok: boolean;
  error: string | null;
};

export async function sendTelegramMessage(
  chatId: string | null | undefined,
  text: string
): Promise<TelegramSendResult> {
  if (!chatId) {
    return { ok: false, error: "Sin chat id vinculado." };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN no configurado (modo simulacion)." };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      return { ok: false, error: `Telegram API ${response.status}: ${message}` };
    }

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
