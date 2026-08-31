const TELEGRAM_API_BASE = "https://api.telegram.org";

export interface SendResult {
  ok: boolean;
  errorCode?: number;
  errorReason?: "BOT_BLOCKED" | "CHAT_NOT_FOUND" | "NETWORK" | "UNKNOWN";
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[telegram] TELEGRAM_BOT_TOKEN no configurado");
    return { ok: false, errorReason: "UNKNOWN" };
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: controller.signal,
    });

    if (response.ok) return { ok: true };

    const body = await response.json().catch(() => null);
    const description: string = body?.description ?? "";

    if (response.status === 403) {
      return { ok: false, errorCode: 403, errorReason: "BOT_BLOCKED" };
    }
    if (response.status === 400 && description.includes("chat not found")) {
      return { ok: false, errorCode: 400, errorReason: "CHAT_NOT_FOUND" };
    }

    console.error(`[telegram] error ${response.status}: ${description}`);
    return { ok: false, errorCode: response.status, errorReason: "UNKNOWN" };
  } catch (err) {
    console.error("[telegram] fallo de red", err);
    return { ok: false, errorReason: "NETWORK" };
  } finally {
    clearTimeout(timeout);
  }
}
