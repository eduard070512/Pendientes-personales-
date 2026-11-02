import "server-only";

/** Hay forma de mandar correos: Resend o un webhook de n8n. */
export function emailConfigured() {
  return Boolean((process.env.RESEND_API_KEY && process.env.EMAIL_FROM) || process.env.N8N_EMAIL_WEBHOOK_URL);
}

async function viaResend(to: string, subject: string, html: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) console.error("[email] Resend respondió", res.status, await res.text());
  return res.ok;
}

/** n8n recibe { to, subject, html, text } y lo manda con su nodo de Gmail. */
async function viaN8n(to: string, subject: string, html: string, text: string) {
  const res = await fetch(process.env.N8N_EMAIL_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-pendientes-secret": process.env.N8N_EMAIL_SECRET ?? "" },
    body: JSON.stringify({ to, subject, html, text }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) console.error("[email] n8n respondió", res.status, await res.text().catch(() => ""));
  return res.ok;
}

/** Envía un correo con Resend si está configurado; si no, con el webhook de n8n. */
export async function sendEmail(to: string, subject: string, html: string, text: string) {
  try {
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return await viaResend(to, subject, html, text);
    if (process.env.N8N_EMAIL_WEBHOOK_URL) return await viaN8n(to, subject, html, text);
  } catch (e) {
    console.error("[email] Error al enviar:", (e as Error).message);
    return false;
  }
  console.warn(`[email] No hay Resend ni n8n configurado. Correo para ${to}: ${subject}\n${text}`);
  return false;
}
