let cachedBotUsername: string | null = null;

/**
 * Resuelve el username del bot de Telegram a partir del token (getMe).
 * El resultado se cachea en memoria porque el token rara vez cambia.
 * Devuelve null si no hay token o la API no responde.
 */
export async function getBotUsername(): Promise<string | null> {
  if (cachedBotUsername) return cachedBotUsername;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token?.trim()) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const json = await res.json().catch(() => null);
    const username = json?.result?.username ?? null;
    if (typeof username === "string" && username) {
      cachedBotUsername = username;
      return username;
    }
    return null;
  } catch {
    return null;
  }
}
