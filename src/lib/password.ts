import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1 };

/** Hash con scrypt: `scrypt$N$salt$hash` (base64). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, 64, PARAMS);
  return `scrypt$${PARAMS.N}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, n, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const got = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, { ...PARAMS, N: Number(n) });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Hash ficticio para que un correo inexistente tarde lo mismo que uno real. */
export const DUMMY_HASH = "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

export function passwordProblem(pw: string) {
  if (pw.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (pw.length > 200) return "La contraseña es demasiado larga.";
  return null;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}
