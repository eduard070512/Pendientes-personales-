// Cookie de sesión firmada con HMAC-SHA256 (Web Crypto): sirve en el proxy y en el servidor.
// Formato: v2.<userId>.<sessionVersion>.<expira>.<firma>

export const SESSION_COOKIE = "pp_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET no está configurada (mínimo 16 caracteres).");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(userId: number, version: number) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `v2.${userId}.${version}.${expires}`;
  return `${payload}.${await hmac(payload)}`;
}

export type SessionPayload = { userId: number; version: number };

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v2") return null;
  const [, uid, ver, exp, sig] = parts;
  const userId = Number(uid);
  const version = Number(ver);
  const expires = Number(exp);
  if (!Number.isInteger(userId) || !Number.isInteger(version) || !Number.isFinite(expires) || expires < Date.now()) return null;
  try {
    return safeEqual(sig, await hmac(parts.slice(0, 4).join("."))) ? { userId, version } : null;
  } catch {
    return null;
  }
}
