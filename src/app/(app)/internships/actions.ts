"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { internshipSteps, internships } from "@/db/schema";
import { requireUid } from "@/lib/auth";
import { id, optDate, str } from "@/lib/format";
import { INTERNSHIP_SEED } from "@/lib/seed-internships";

function fields(fd: FormData) {
  return {
    company: str(fd, "company"),
    program: str(fd, "program"),
    url: str(fd, "url"),
    location: str(fd, "location"),
    modality: str(fd, "modality"),
    pay: str(fd, "pay"),
    deadline: optDate(fd, "deadline"),
    status: str(fd, "status") || "investigando",
    notes: str(fd, "notes"),
  };
}

function refresh(iid?: number) {
  revalidatePath("/internships");
  revalidatePath("/calendario");
  revalidatePath("/");
  if (iid) revalidatePath(`/internships/${iid}`);
}

const mine = (uid: number, iid: number) => and(eq(internships.id, iid), eq(internships.userId, uid));
const myStep = (uid: number, fd: FormData) =>
  and(eq(internshipSteps.id, id(fd)), eq(internshipSteps.internshipId, Number(fd.get("internshipId"))), eq(internshipSteps.userId, uid));

export async function createInternship(fd: FormData) {
  const uid = await requireUid();
  const data = fields(fd);
  if (!data.company) return;
  const [row] = await db.insert(internships).values({ ...data, userId: uid }).returning({ id: internships.id });
  refresh();
  redirect(`/internships/${row.id}`);
}

export async function updateInternship(fd: FormData) {
  const uid = await requireUid();
  const iid = id(fd);
  const data = fields(fd);
  if (!data.company) return;
  await db.update(internships).set({ ...data, updatedAt: new Date() }).where(mine(uid, iid));
  refresh(iid);
}

export async function setInternshipStatus(fd: FormData) {
  const uid = await requireUid();
  const iid = id(fd);
  await db.update(internships).set({ status: str(fd, "status"), updatedAt: new Date() }).where(mine(uid, iid));
  refresh(iid);
}

export async function deleteInternship(fd: FormData) {
  const uid = await requireUid();
  await db.delete(internships).where(mine(uid, id(fd)));
  refresh();
  redirect("/internships");
}

export async function addStep(fd: FormData) {
  const uid = await requireUid();
  const iid = Number(fd.get("internshipId"));
  const title = str(fd, "title");
  if (!iid || !title) return;
  const [own] = await db.select({ id: internships.id }).from(internships).where(mine(uid, iid));
  if (!own) return;
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${internshipSteps.position}), 0)` })
    .from(internshipSteps)
    .where(eq(internshipSteps.internshipId, iid));
  await db.insert(internshipSteps).values({ internshipId: iid, userId: uid, title, dueDate: optDate(fd, "dueDate"), position: Number(max) + 1 });
  refresh(iid);
}

export async function toggleStep(fd: FormData) {
  const uid = await requireUid();
  await db.update(internshipSteps).set({ done: sql`not ${internshipSteps.done}` }).where(myStep(uid, fd));
  refresh(Number(fd.get("internshipId")));
}

export async function updateStep(fd: FormData) {
  const uid = await requireUid();
  const title = str(fd, "title");
  if (!title) return;
  await db.update(internshipSteps).set({ title, dueDate: optDate(fd, "dueDate") }).where(myStep(uid, fd));
  refresh(Number(fd.get("internshipId")));
}

export async function deleteStep(fd: FormData) {
  const uid = await requireUid();
  await db.delete(internshipSteps).where(myStep(uid, fd));
  refresh(Number(fd.get("internshipId")));
}

export async function seedInternships() {
  const uid = await requireUid();
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(internships).where(eq(internships.userId, uid));
  if (Number(count) > 0) return;
  for (const { steps, ...data } of INTERNSHIP_SEED) {
    const [row] = await db.insert(internships).values({ ...data, userId: uid }).returning({ id: internships.id });
    if (steps.length) {
      await db
        .insert(internshipSteps)
        .values(steps.map(([title, dueDate], i) => ({ internshipId: row.id, userId: uid, title, dueDate, position: i + 1 })));
    }
  }
  refresh();
}
