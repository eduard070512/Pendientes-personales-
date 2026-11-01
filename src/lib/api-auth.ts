import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sha256 } from "./password";
import { safeEqual } from "./session";

function bearer(req: Request) {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
}

/** `Authorization: Bearer <CRON_SECRET>`: lo usa el cron de Vercel. */
export function cronOk(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && secret.length >= 16 && safeEqual(bearer(req), secret));
}

/** `Authorization: Bearer <token personal>`: el token que cada usuario genera en Mi cuenta (para n8n). */
export async function userFromToken(req: Request) {
  const token = bearer(req);
  if (!token.startsWith("pp_") || token.length < 20) return null;
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.apiTokenHash, sha256(token)));
  return u?.id ?? null;
}
