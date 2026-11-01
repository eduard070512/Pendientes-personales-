import "server-only";
import { decrypt, deleteSetting, encrypt, getSetting, setSetting } from "./settings";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
];

const TOKEN_KEY = "google.refresh_token";
const EMAIL_KEY = "google.email";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(origin: string) {
  return `${process.env.APP_URL || origin}/api/google/callback`;
}

export function authUrl(origin: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...body,
    }),
  });
  const json = (await res.json()) as { access_token?: string; refresh_token?: string; id_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(json.error_description || json.error || `Google respondió ${res.status}`);
  return json;
}

/** Intercambia el código del callback y guarda el refresh token (cifrado). */
export async function connectWithCode(code: string, origin: string) {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri(origin) });
  if (!t.refresh_token) throw new Error("Google no devolvió un refresh token. Quita el acceso de la app en tu cuenta de Google y vuelve a conectar.");
  await setSetting(TOKEN_KEY, await encrypt(t.refresh_token));
  if (t.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(t.id_token.split(".")[1], "base64url").toString());
      if (payload.email) await setSetting(EMAIL_KEY, payload.email);
    } catch {
      /* el correo es solo informativo */
    }
  }
}

export async function googleAccount() {
  const token = await getSetting(TOKEN_KEY);
  return token ? { email: (await getSetting(EMAIL_KEY)) ?? "cuenta conectada" } : null;
}

export async function disconnectGoogle() {
  const stored = await getSetting(TOKEN_KEY);
  if (stored) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(await decrypt(stored))}`, { method: "POST" });
    } catch {
      /* si falla la revocación, igual se borra localmente */
    }
  }
  await deleteSetting(TOKEN_KEY);
  await deleteSetting(EMAIL_KEY);
}

export async function accessToken() {
  const stored = await getSetting(TOKEN_KEY);
  if (!stored) return null;
  const t = await tokenRequest({ refresh_token: await decrypt(stored), grant_type: "refresh_token" });
  return t.access_token!;
}
