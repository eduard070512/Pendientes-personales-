"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, safeEqual } from "@/lib/session";

export type LoginState = { error: string; user: string } | null;

export async function login(_: LoginState, fd: FormData): Promise<LoginState> {
  const user = String(fd.get("user") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "/");

  const expectedUser = process.env.APP_USER ?? "";
  const expectedPassword = process.env.APP_PASSWORD ?? "";
  if (!expectedUser || !expectedPassword) return { error: "Faltan APP_USER y APP_PASSWORD en las variables de entorno.", user };

  // Pequeña pausa para frenar ataques de fuerza bruta.
  await new Promise((r) => setTimeout(r, 600));
  const ok = safeEqual(user.toLowerCase(), expectedUser.toLowerCase()) && safeEqual(password, expectedPassword);
  if (!ok) return { error: "Usuario o contraseña incorrectos.", user };

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
