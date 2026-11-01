"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { jobEvents, jobs } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { id, optDate, str } from "@/lib/format";

function fields(fd: FormData) {
  return {
    company: str(fd, "company"),
    position: str(fd, "position"),
    url: str(fd, "url"),
    source: str(fd, "source"),
    contactName: str(fd, "contactName"),
    contactEmail: str(fd, "contactEmail"),
    salary: str(fd, "salary"),
    modality: str(fd, "modality"),
    status: str(fd, "status") || "guardado",
    appliedAt: optDate(fd, "appliedAt"),
    nextFollowUp: optDate(fd, "nextFollowUp"),
    notes: str(fd, "notes"),
  };
}

function refresh(jid?: number) {
  revalidatePath("/trabajos");
  revalidatePath("/calendario");
  revalidatePath("/");
  if (jid) revalidatePath(`/trabajos/${jid}`);
}

export async function createJob(fd: FormData) {
  await requireAuth();
  const data = fields(fd);
  if (!data.company) return;
  if (data.status === "aplicado" && !data.appliedAt) data.appliedAt = todayISO();
  const [row] = await db.insert(jobs).values(data).returning({ id: jobs.id });
  if (data.status === "aplicado") await db.insert(jobEvents).values({ jobId: row.id, date: data.appliedAt!, note: "CV enviado" });
  refresh();
  redirect(`/trabajos/${row.id}`);
}

export async function updateJob(fd: FormData) {
  await requireAuth();
  const jid = id(fd);
  const data = fields(fd);
  if (!data.company) return;
  await db.update(jobs).set({ ...data, updatedAt: new Date() }).where(eq(jobs.id, jid));
  refresh(jid);
}

export async function setJobStatus(fd: FormData) {
  await requireAuth();
  const jid = id(fd);
  const status = str(fd, "status");
  const [prev] = await db.select().from(jobs).where(eq(jobs.id, jid));
  if (!prev || prev.status === status) return;
  const patch: Partial<typeof jobs.$inferInsert> = { status, updatedAt: new Date() };
  if (status === "aplicado" && !prev.appliedAt) patch.appliedAt = todayISO();
  await db.update(jobs).set(patch).where(eq(jobs.id, jid));
  const labels: Record<string, string> = { aplicado: "CV enviado", entrevista: "Entrevista", oferta: "Oferta recibida", rechazado: "Rechazado", sin_respuesta: "Sin respuesta", guardado: "Guardado" };
  await db.insert(jobEvents).values({ jobId: jid, date: todayISO(), note: `Estado → ${labels[status] ?? status}` });
  refresh(jid);
}

export async function deleteJob(fd: FormData) {
  await requireAuth();
  await db.delete(jobs).where(eq(jobs.id, id(fd)));
  refresh();
  redirect("/trabajos");
}

export async function addJobEvent(fd: FormData) {
  await requireAuth();
  const jid = Number(fd.get("jobId"));
  const note = str(fd, "note");
  if (!jid || !note) return;
  await db.insert(jobEvents).values({ jobId: jid, date: optDate(fd, "date") ?? todayISO(), note });
  const next = optDate(fd, "nextFollowUp");
  await db.update(jobs).set({ updatedAt: new Date(), ...(next ? { nextFollowUp: next } : {}) }).where(eq(jobs.id, jid));
  refresh(jid);
}

export async function deleteJobEvent(fd: FormData) {
  await requireAuth();
  const jid = Number(fd.get("jobId"));
  await db.delete(jobEvents).where(and(eq(jobEvents.id, id(fd)), eq(jobEvents.jobId, jid)));
  refresh(jid);
}
