"use server";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { endSession, startSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { claimLegacyData } from "@/lib/legacy";
import { DUMMY_HASH, hashPassword, normalizeEmail, passwordProblem, randomToken, sha256, validEmail, verifyPassword } from "@/lib/password";

export type FormState = { error?: string; ok?: string; email?: string; name?: string } | null;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(String(fd.get("email") ?? ""));
  const password = String(fd.get("password") ?? "");
  await pause(300); // frena ataques de fuerza bruta
  const [u] = await db.select().from(users).where(eq(users.email, email));
  const ok = await verifyPassword(password, u?.passwordHash ?? DUMMY_HASH);
  if (!u || !ok) return { error: "Correo o contraseña incorrectos.", email };
  await startSession(u.id, u.sessionVersion);
  redirect(safeNext(String(fd.get("next") ?? "/")));
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const email = normalizeEmail(String(fd.get("email") ?? ""));
  const password = String(fd.get("password") ?? "");
  const back = { email, name };
  if (!name) return { error: "Escribe tu nombre.", ...back };
  if (!validEmail(email)) return { error: "Ese correo no parece válido.", ...back };
  const problem = passwordProblem(password);
  if (problem) return { error: problem, ...back };
  if (password !== String(fd.get("password2") ?? "")) return { error: "Las contraseñas no coinciden.", ...back };

  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (exists) return { error: "Ya hay una cuenta con ese correo. Inicia sesión o recupera tu contraseña.", ...back };

  const [u] = await db
    .insert(users)
    .values({ email, name, passwordHash: await hashPassword(password) })
    .onConflictDoNothing()
    .returning({ id: users.id, sessionVersion: users.sessionVersion });
  if (!u) return { error: "Ya hay una cuenta con ese correo.", ...back };
  await claimLegacyData(u.id, email);
  await startSession(u.id, u.sessionVersion);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

async function origin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function requestReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(String(fd.get("email") ?? ""));
  const generic = { ok: "Si hay una cuenta con ese correo, te enviamos un enlace para cambiar tu contraseña. Revisa también spam.", email };
  if (!validEmail(email)) return { error: "Ese correo no parece válido.", email };
  await pause(300);
  const [u] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email));
  if (!u) return generic; // no revelamos si el correo existe

  // Máximo 3 correos por hora por cuenta.
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(passwordResets)
    .where(and(eq(passwordResets.userId, u.id), gt(passwordResets.createdAt, sql`now() - interval '1 hour'`)));
  if (Number(n) >= 3) return generic;

  const token = randomToken();
  await db.insert(passwordResets).values({ userId: u.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
  const link = `${await origin()}/restablecer?token=${token}`;
  const hi = u.name ? `Hola, ${u.name}:` : "Hola:";
  await sendEmail(
    email,
    "Cambia tu contraseña de Pendientes",
    `<p>${hi}</p><p>Pediste cambiar tu contraseña. Este enlace funciona una sola vez y vence en 1 hora:</p><p><a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Cambiar contraseña</a></p><p style="color:#666;font-size:13px">Si no fuiste tú, ignora este correo; tu contraseña no cambia.</p>`,
    `${hi}\n\nPediste cambiar tu contraseña. Abre este enlace (vence en 1 hora):\n${link}\n\nSi no fuiste tú, ignora este correo.`,
  );
  return generic;
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== String(fd.get("password2") ?? "")) return { error: "Las contraseñas no coinciden." };

  const [r] = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.tokenHash, sha256(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())));
  if (!r) return { error: "El enlace ya se usó o venció. Pide uno nuevo." };

  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, r.id));
  // Subir sessionVersion cierra la sesión en todos los dispositivos.
  const [u] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, r.userId))
    .returning({ id: users.id, sessionVersion: users.sessionVersion });
  await startSession(u.id, u.sessionVersion);
  redirect("/");
}
