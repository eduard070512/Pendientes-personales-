import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, verifySessionToken } from "./session";

export type CurrentUser = Pick<typeof users.$inferSelect, "id" | "email" | "name" | "bio" | "plan" | "sessionVersion">;

/** Usuario de la sesión actual (una consulta por petición). */
export const getUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const s = await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const [u] = await db
    .select({ id: users.id, email: users.email, name: users.name, bio: users.bio, plan: users.plan, sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, s.userId));
  // Si cambió la contraseña (sessionVersion subió), las sesiones viejas dejan de valer.
  return u && u.sessionVersion === s.version ? u : null;
});

/** Para páginas y server actions: devuelve el usuario o manda a /login. */
export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

/** Atajo para filtrar por dueño: `const uid = await requireUid()`. */
export async function requireUid() {
  return (await requireUser()).id;
}

export async function startSession(userId: number, version: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(userId, version), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
