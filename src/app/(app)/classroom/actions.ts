"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { classroomItems, taskUpdates, tasks } from "@/db/schema";
import { requireUid } from "@/lib/auth";
import { syncFromApi } from "@/lib/classroom";
import { id } from "@/lib/format";
import { disconnectGoogle } from "@/lib/google";

function refresh() {
  revalidatePath("/classroom");
  revalidatePath("/calendario");
  revalidatePath("/pendientes");
  revalidatePath("/");
}

export async function syncNow(): Promise<{ ok: boolean; message: string }> {
  const uid = await requireUid();
  try {
    const r = await syncFromApi(uid);
    refresh();
    return { ok: true, message: `Listo: ${r.items} tareas de ${r.courses} clases.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function disconnect() {
  const uid = await requireUid();
  await disconnectGoogle(uid);
  refresh();
}

/** Crea un pendiente ligado a la tarea de Classroom (se marca hecho al entregarla). */
export async function toTask(fd: FormData) {
  const uid = await requireUid();
  const [it] = await db.select().from(classroomItems).where(and(eq(classroomItems.id, id(fd)), eq(classroomItems.userId, uid)));
  if (!it) return;
  if (it.taskId) redirect(`/pendientes/${it.taskId}`);
  const [t] = await db
    .insert(tasks)
    .values({
      userId: uid,
      title: it.title,
      description: [it.courseName && `Clase: ${it.courseName}`, it.link && `Classroom: ${it.link}`, it.description].filter(Boolean).join("\n\n"),
      dueDate: it.dueDate,
      category: "Escuela",
      priority: "media",
    })
    .returning({ id: tasks.id });
  await db.insert(taskUpdates).values({ taskId: t.id, userId: uid, note: "Creado desde Classroom" });
  await db.update(classroomItems).set({ taskId: t.id }).where(eq(classroomItems.id, it.id));
  refresh();
  redirect(`/pendientes/${t.id}`);
}

export async function toggleHidden(fd: FormData) {
  const uid = await requireUid();
  const mine = and(eq(classroomItems.id, id(fd)), eq(classroomItems.userId, uid));
  const [it] = await db.select({ hidden: classroomItems.hidden }).from(classroomItems).where(mine);
  if (!it) return;
  await db.update(classroomItems).set({ hidden: !it.hidden }).where(mine);
  refresh();
}
