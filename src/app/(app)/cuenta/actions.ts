"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { endSession, requireUser, startSession } from "@/lib/auth";
import { disconnectGoogle } from "@/lib/google";
import { hashPassword, passwordProblem, randomToken, sha256, verifyPassword } from "@/lib/password";

export type AccountState = { error?: string; ok?: string; token?: string } | null;

export async function updateProfile(_: AccountState, fd: FormData): Promise<AccountState> {
  const u = await requireUser();
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const bio = String(fd.get("bio") ?? "").trim().slice(0, 1500);
  if (!name) return { error: "Escribe tu nombre." };
  await db.update(users).set({ name, bio, updatedAt: new Date() }).where(eq(users.id, u.id));
  revalidatePath("/", "layout");
  return { ok: "Perfil guardado." };
}

async function checkPassword(userId: number, password: string) {
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId));
  return Boolean(row && (await verifyPassword(password, row.hash)));
}

export async function changePassword(_: AccountState, fd: FormData): Promise<AccountState> {
  const u = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  if (!(await checkPassword(u.id, current))) return { error: "Tu contraseña actual no es correcta." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== String(fd.get("password2") ?? "")) return { error: "Las contraseñas nuevas no coinciden." };
  const [row] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, u.id))
    .returning({ v: users.sessionVersion });
  await startSession(u.id, row.v); // esta sesión sigue; las demás se cierran
  return { ok: "Contraseña cambiada. Se cerró la sesión en tus otros dispositivos." };
}

/** Genera un token personal nuevo (invalida el anterior). Solo se muestra una vez. */
export async function regenerateToken(): Promise<AccountState> {
  const u = await requireUser();
  const token = `pp_${randomToken(24)}`;
  await db.update(users).set({ apiTokenHash: sha256(token), updatedAt: new Date() }).where(eq(users.id, u.id));
  revalidatePath("/cuenta");
  return { token };
}

export async function revokeToken() {
  const u = await requireUser();
  await db.update(users).set({ apiTokenHash: null, updatedAt: new Date() }).where(eq(users.id, u.id));
  revalidatePath("/cuenta");
}

export async function logoutEverywhere() {
  const u = await requireUser();
  await db.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, u.id));
  await endSession();
  redirect("/login");
}

export async function deleteAccount(_: AccountState, fd: FormData): Promise<AccountState> {
  const u = await requireUser();
  if (String(fd.get("confirm") ?? "").trim().toLowerCase() !== "borrar") return { error: 'Escribe "BORRAR" para confirmar.' };
  if (!(await checkPassword(u.id, String(fd.get("password") ?? "")))) return { error: "Contraseña incorrecta." };
  await disconnectGoogle(u.id).catch(() => {});
  await db.delete(users).where(eq(users.id, u.id)); // borra en cascada todos sus datos
  await endSession();
  redirect("/registro");
}
