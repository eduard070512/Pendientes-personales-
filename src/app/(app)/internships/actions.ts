"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { internshipSteps, internships } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
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

export async function createInternship(fd: FormData) {
  await requireAuth();
  const data = fields(fd);
  if (!data.company) return;
  const [row] = await db.insert(internships).values(data).returning({ id: internships.id });
  refresh();
  redirect(`/internships/${row.id}`);
}

export async function updateInternship(fd: FormData) {
  await requireAuth();
  const iid = id(fd);
  const data = fields(fd);
  if (!data.company) return;
  await db.update(internships).set({ ...data, updatedAt: new Date() }).where(eq(internships.id, iid));
  refresh(iid);
}

export async function setInternshipStatus(fd: FormData) {
  await requireAuth();
  const iid = id(fd);
  await db.update(internships).set({ status: str(fd, "status"), updatedAt: new Date() }).where(eq(internships.id, iid));
  refresh(iid);
}

export async function deleteInternship(fd: FormData) {
  await requireAuth();
  await db.delete(internships).where(eq(internships.id, id(fd)));
  refresh();
  redirect("/internships");
}

export async function addStep(fd: FormData) {
  await requireAuth();
  const iid = Number(fd.get("internshipId"));
  const title = str(fd, "title");
  if (!iid || !title) return;
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${internshipSteps.position}), 0)` })
    .from(internshipSteps)
    .where(eq(internshipSteps.internshipId, iid));
  await db.insert(internshipSteps).values({ internshipId: iid, title, dueDate: optDate(fd, "dueDate"), position: Number(max) + 1 });
  refresh(iid);
}

export async function toggleStep(fd: FormData) {
  await requireAuth();
  const iid = Number(fd.get("internshipId"));
  await db
    .update(internshipSteps)
    .set({ done: sql`not ${internshipSteps.done}` })
    .where(and(eq(internshipSteps.id, id(fd)), eq(internshipSteps.internshipId, iid)));
  refresh(iid);
}

export async function updateStep(fd: FormData) {
  await requireAuth();
  const iid = Number(fd.get("internshipId"));
  const title = str(fd, "title");
  if (!title) return;
  await db
    .update(internshipSteps)
    .set({ title, dueDate: optDate(fd, "dueDate") })
    .where(and(eq(internshipSteps.id, id(fd)), eq(internshipSteps.internshipId, iid)));
  refresh(iid);
}

export async function deleteStep(fd: FormData) {
  await requireAuth();
  const iid = Number(fd.get("internshipId"));
  await db.delete(internshipSteps).where(and(eq(internshipSteps.id, id(fd)), eq(internshipSteps.internshipId, iid)));
  refresh(iid);
}

export async function seedInternships() {
  await requireAuth();
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(internships);
  if (Number(count) > 0) return;
  for (const { steps, ...data } of INTERNSHIP_SEED) {
    const [row] = await db.insert(internships).values(data).returning({ id: internships.id });
    if (steps.length) {
      await db
        .insert(internshipSteps)
        .values(steps.map(([title, dueDate], i) => ({ internshipId: row.id, title, dueDate, position: i + 1 })));
    }
  }
  refresh();
}
