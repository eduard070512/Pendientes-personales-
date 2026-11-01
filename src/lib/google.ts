import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
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
export async function connectWithCode(userId: number, code: string, origin: string) {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri(origin) });
  if (!t.refresh_token) throw new Error("Google no devolvió un refresh token. Quita el acceso de la app en tu cuenta de Google y vuelve a conectar.");
  await setSetting(userId, TOKEN_KEY, await encrypt(t.refresh_token));
  if (t.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(t.id_token.split(".")[1], "base64url").toString());
      if (payload.email) await setSetting(userId, EMAIL_KEY, payload.email);
    } catch {
      /* el correo es solo informativo */
    }
  }
}

export async function googleAccount(userId: number) {
  const token = await getSetting(userId, TOKEN_KEY);
  return token ? { email: (await getSetting(userId, EMAIL_KEY)) ?? "cuenta conectada" } : null;
}

/** Usuarios con Google conectado (para el cron). */
export async function connectedUserIds() {
  const rows = await db.select({ userId: settings.userId }).from(settings).where(eq(settings.key, TOKEN_KEY));
  return rows.map((r) => r.userId);
}

export async function disconnectGoogle(userId: number) {
  const stored = await getSetting(userId, TOKEN_KEY);
  if (stored) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(await decrypt(stored))}`, { method: "POST" });
    } catch {
      /* si falla la revocación, igual se borra localmente */
    }
  }
  await deleteSetting(userId, TOKEN_KEY);
  await deleteSetting(userId, EMAIL_KEY);
}

export async function accessToken(userId: number) {
  const stored = await getSetting(userId, TOKEN_KEY);
  if (!stored) return null;
  const t = await tokenRequest({ refresh_token: await decrypt(stored), grant_type: "refresh_token" });
  return t.access_token!;
}
