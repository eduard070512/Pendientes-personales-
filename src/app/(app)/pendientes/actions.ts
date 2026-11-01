"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { taskUpdates, tasks } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { id, optDate, str } from "@/lib/format";

function fields(fd: FormData) {
  return {
    title: str(fd, "title"),
    description: str(fd, "description"),
    dueDate: optDate(fd, "dueDate"),
    priority: str(fd, "priority") || "media",
    category: str(fd, "category"),
  };
}

function refresh(taskId?: number) {
  revalidatePath("/pendientes");
  revalidatePath("/calendario");
  revalidatePath("/");
  if (taskId) revalidatePath(`/pendientes/${taskId}`);
}

export async function createTask(fd: FormData) {
  await requireAuth();
  const data = fields(fd);
  if (!data.title) return;
  await db.insert(tasks).values(data);
  refresh();
}

export async function updateTask(fd: FormData) {
  await requireAuth();
  const taskId = id(fd);
  const data = fields(fd);
  if (!data.title) return;
  await db.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, taskId));
  refresh(taskId);
}

export async function setTaskStatus(fd: FormData) {
  await requireAuth();
  const taskId = id(fd);
  const status = str(fd, "status");
  if (!["pendiente", "en_progreso", "hecho"].includes(status)) return;
  const [prev] = await db.select({ status: tasks.status }).from(tasks).where(eq(tasks.id, taskId));
  if (!prev || prev.status === status) return;
  await db
    .update(tasks)
    .set({ status, completedAt: status === "hecho" ? new Date() : null, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));
  const label = { pendiente: "Pendiente", en_progreso: "En progreso", hecho: "Hecho" }[status];
  await db.insert(taskUpdates).values({ taskId, note: `Estado → ${label}` });
  refresh(taskId);
}

/** Casilla rápida de la lista: alterna entre hecho y pendiente. */
export async function toggleTaskDone(fd: FormData) {
  await requireAuth();
  const taskId = id(fd);
  const [t] = await db.select({ status: tasks.status }).from(tasks).where(eq(tasks.id, taskId));
  if (!t) return;
  const next = new FormData();
  next.set("id", String(taskId));
  next.set("status", t.status === "hecho" ? "pendiente" : "hecho");
  await setTaskStatus(next);
}

export async function deleteTask(fd: FormData) {
  await requireAuth();
  await db.delete(tasks).where(eq(tasks.id, id(fd)));
  refresh();
  redirect("/pendientes");
}

export async function addTaskUpdate(fd: FormData) {
  await requireAuth();
  const taskId = Number(fd.get("taskId"));
  const note = str(fd, "note");
  if (!taskId || !note) return;
  await db.insert(taskUpdates).values({ taskId, note });
  await db.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, taskId));
  refresh(taskId);
}

export async function deleteTaskUpdate(fd: FormData) {
  await requireAuth();
  const taskId = Number(fd.get("taskId"));
  await db.delete(taskUpdates).where(and(eq(taskUpdates.id, id(fd)), eq(taskUpdates.taskId, taskId)));
  refresh(taskId);
}

/** Se llama al pulsar "Trabajar con Claude": deja constancia y lo pasa a "en progreso". */
export async function startWithClaude(taskId: number) {
  await requireAuth();
  const [t] = await db.select({ status: tasks.status }).from(tasks).where(eq(tasks.id, taskId));
  if (!t) return;
  await db.insert(taskUpdates).values({ taskId, note: "Abrí Claude para trabajar en este pendiente" });
  if (t.status === "pendiente") {
    await db.update(tasks).set({ status: "en_progreso", updatedAt: new Date() }).where(eq(tasks.id, taskId));
  }
  refresh(taskId);
}
