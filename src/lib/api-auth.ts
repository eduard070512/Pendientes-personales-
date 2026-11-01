import { safeEqual } from "./session";

/** Valida `Authorization: Bearer <CRON_SECRET>` (lo usan el cron de Vercel y n8n). */
export function bearerOk(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return safeEqual(got, secret);
}
