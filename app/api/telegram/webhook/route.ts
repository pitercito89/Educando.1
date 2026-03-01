import { consumeTelegramCode } from "@/lib/db";

type TelegramUpdate = {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
};

async function sendReply(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    cache: "no-store",
  }).catch(() => undefined);
}

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return Response.json({ ok: false, error: "TELEGRAM_BOT_TOKEN no configurado." }, { status: 500 });
  }

  const payload = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const chatId = payload?.message?.chat?.id;
  const text = (payload?.message?.text ?? "").trim();

  if (!chatId || !text) {
    return Response.json({ ok: true });
  }

  let code = "";
  if (text.startsWith("/start")) {
    code = text.replace("/start", "").trim();
  } else if (/^(STD|PAD)-[A-Z0-9-]+$/i.test(text)) {
    // Permite pegar solo el codigo en el chat del bot.
    code = text.trim();
  }

  if (!code) {
    await sendReply(
      chatId,
      "Envia /start CODIGO o pega solo el CODIGO para vincular tu cuenta."
    );
    return Response.json({ ok: true });
  }

  const result = await consumeTelegramCode({ code, chatId: String(chatId) });
  if (result.error || !result.data) {
    await sendReply(chatId, "Codigo invalido o expirado. Genera uno nuevo desde tu dashboard.");
    return Response.json({ ok: true });
  }

  await sendReply(
    chatId,
    `Vinculacion completada para ${result.data.role}: ${result.data.fullName}.`
  );
  return Response.json({ ok: true });
}
