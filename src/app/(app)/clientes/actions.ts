"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clientNotes, clients } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { id, optDate, optMoney, str } from "@/lib/format";
import { CLIENT_STAGE, opt } from "@/lib/constants";

function fields(fd: FormData) {
  return {
    name: str(fd, "name"),
    business: str(fd, "business"),
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    city: str(fd, "city"),
    source: str(fd, "source"),
    product: str(fd, "product"),
    stage: str(fd, "stage") || "prospecto",
    value: optMoney(fd, "value"),
    nextFollowUp: optDate(fd, "nextFollowUp"),
    notes: str(fd, "notes"),
  };
}

function refresh(cid?: number) {
  revalidatePath("/clientes");
  revalidatePath("/calendario");
  revalidatePath("/");
  if (cid) revalidatePath(`/clientes/${cid}`);
}

export async function createClient(fd: FormData) {
  await requireAuth();
  const data = fields(fd);
  if (!data.name) return;
  const [row] = await db.insert(clients).values(data).returning({ id: clients.id });
  refresh();
  redirect(`/clientes/${row.id}`);
}

export async function updateClient(fd: FormData) {
  await requireAuth();
  const cid = id(fd);
  const data = fields(fd);
  if (!data.name) return;
  await db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, cid));
  refresh(cid);
}

export async function setClientStage(fd: FormData) {
  await requireAuth();
  const cid = id(fd);
  const stage = str(fd, "stage");
  const [prev] = await db.select({ stage: clients.stage }).from(clients).where(eq(clients.id, cid));
  if (!prev || prev.stage === stage) return;
  await db.update(clients).set({ stage, updatedAt: new Date() }).where(eq(clients.id, cid));
  await db.insert(clientNotes).values({ clientId: cid, date: todayISO(), note: `Etapa → ${opt(CLIENT_STAGE, stage).label}` });
  refresh(cid);
}

export async function deleteClient(fd: FormData) {
  await requireAuth();
  await db.delete(clients).where(eq(clients.id, id(fd)));
  refresh();
  redirect("/clientes");
}

export async function addClientNote(fd: FormData) {
  await requireAuth();
  const cid = Number(fd.get("clientId"));
  const note = str(fd, "note");
  if (!cid || !note) return;
  await db.insert(clientNotes).values({ clientId: cid, date: optDate(fd, "date") ?? todayISO(), note });
  const next = optDate(fd, "nextFollowUp");
  await db.update(clients).set({ updatedAt: new Date(), ...(next ? { nextFollowUp: next } : {}) }).where(eq(clients.id, cid));
  refresh(cid);
}

export async function deleteClientNote(fd: FormData) {
  await requireAuth();
  const cid = Number(fd.get("clientId"));
  await db.delete(clientNotes).where(and(eq(clientNotes.id, id(fd)), eq(clientNotes.clientId, cid)));
  refresh(cid);
}
