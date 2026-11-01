import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export async function getSetting(userId: number, key: string) {
  const [row] = await db.select().from(settings).where(and(eq(settings.userId, userId), eq(settings.key, key)));
  return row?.value ?? null;
}

export async function setSetting(userId: number, key: string, value: string) {
  await db
    .insert(settings)
    .values({ userId, key, value })
    .onConflictDoUpdate({ target: [settings.userId, settings.key], set: { value, updatedAt: new Date() } });
}

export async function deleteSetting(userId: number, key: string) {
  await db.delete(settings).where(and(eq(settings.userId, userId), eq(settings.key, key)));
}

/* Cifrado AES-GCM para guardar tokens en la base (llave derivada de SESSION_SECRET). */
const enc = new TextEncoder();

async function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está configurada.");
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(`pp-tokens:${secret}`));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encrypt(text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), enc.encode(text)));
  return `${Buffer.from(iv).toString("base64")}.${Buffer.from(data).toString("base64")}`;
}

export async function decrypt(payload: string) {
  const [iv, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const out = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await key(), data);
  return new TextDecoder().decode(out);
}
