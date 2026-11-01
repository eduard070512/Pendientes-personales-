"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { taskUpdates, tasks } from "@/db/schema";
import { requireUid } from "@/lib/auth";
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

const mine = (uid: number, taskId: number) => and(eq(tasks.id, taskId), eq(tasks.userId, uid));

async function ownTask(uid: number, taskId: number) {
  const [t] = await db.select({ id: tasks.id, status: tasks.status }).from(tasks).where(mine(uid, taskId));
  return t ?? null;
}

export async function createTask(fd: FormData) {
  const uid = await requireUid();
  const data = fields(fd);
  if (!data.title) return;
  await db.insert(tasks).values({ ...data, userId: uid });
  refresh();
}

export async function updateTask(fd: FormData) {
  const uid = await requireUid();
  const taskId = id(fd);
  const data = fields(fd);
  if (!data.title) return;
  await db.update(tasks).set({ ...data, updatedAt: new Date() }).where(mine(uid, taskId));
  refresh(taskId);
}

async function changeStatus(uid: number, taskId: number, status: string) {
  if (!["pendiente", "en_progreso", "hecho"].includes(status)) return;
  const prev = await ownTask(uid, taskId);
  if (!prev || prev.status === status) return;
  await db
    .update(tasks)
    .set({ status, completedAt: status === "hecho" ? new Date() : null, updatedAt: new Date() })
    .where(mine(uid, taskId));
  const label = { pendiente: "Pendiente", en_progreso: "En progreso", hecho: "Hecho" }[status];
  await db.insert(taskUpdates).values({ taskId, userId: uid, note: `Estado → ${label}` });
  refresh(taskId);
}

export async function setTaskStatus(fd: FormData) {
  const uid = await requireUid();
  await changeStatus(uid, id(fd), str(fd, "status"));
}

/** Casilla rápida de la lista: alterna entre hecho y pendiente. */
export async function toggleTaskDone(fd: FormData) {
  const uid = await requireUid();
  const t = await ownTask(uid, id(fd));
  if (t) await changeStatus(uid, t.id, t.status === "hecho" ? "pendiente" : "hecho");
}

export async function deleteTask(fd: FormData) {
  const uid = await requireUid();
  await db.delete(tasks).where(mine(uid, id(fd)));
  refresh();
  redirect("/pendientes");
}

export async function addTaskUpdate(fd: FormData) {
  const uid = await requireUid();
  const taskId = Number(fd.get("taskId"));
  const note = str(fd, "note");
  if (!taskId || !note || !(await ownTask(uid, taskId))) return;
  await db.insert(taskUpdates).values({ taskId, userId: uid, note });
  await db.update(tasks).set({ updatedAt: new Date() }).where(mine(uid, taskId));
  refresh(taskId);
}

export async function deleteTaskUpdate(fd: FormData) {
  const uid = await requireUid();
  const taskId = Number(fd.get("taskId"));
  await db.delete(taskUpdates).where(and(eq(taskUpdates.id, id(fd)), eq(taskUpdates.taskId, taskId), eq(taskUpdates.userId, uid)));
  refresh(taskId);
}

/** Se llama al pulsar "Trabajar con Claude": deja constancia y lo pasa a "en progreso". */
export async function startWithClaude(taskId: number) {
  const uid = await requireUid();
  const t = await ownTask(uid, taskId);
  if (!t) return;
  await db.insert(taskUpdates).values({ taskId, userId: uid, note: "Abrí Claude para trabajar en este pendiente" });
  if (t.status === "pendiente") await db.update(tasks).set({ status: "en_progreso", updatedAt: new Date() }).where(mine(uid, taskId));
  refresh(taskId);
}
