import "server-only";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Envía un correo con Resend (https://resend.com). Devuelve false si no está configurado o falla. */
export async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!emailConfigured()) {
    console.warn(`[email] Resend no está configurado. Correo para ${to}: ${subject}\n${text}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) console.error("[email] Resend respondió", res.status, await res.text());
  return res.ok;
}
