import "server-only";
import { and, eq, gte, lte, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { clients, debts, internshipSteps, internships, jobs, recurring, tasks } from "@/db/schema";
import { monthRange } from "./dates";

export type CalEvent = {
  date: string;
  title: string;
  href: string;
  kind: "pendiente" | "internship" | "trabajo" | "cliente" | "dinero";
  done?: boolean;
  overdue?: boolean;
};

export const KIND_STYLE: Record<CalEvent["kind"], { label: string; chip: string; dot: string }> = {
  pendiente: { label: "Pendiente", chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300", dot: "bg-indigo-500" },
  internship: { label: "Internship", chip: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300", dot: "bg-violet-500" },
  trabajo: { label: "Trabajo", chip: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300", dot: "bg-sky-500" },
  cliente: { label: "Cliente", chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", dot: "bg-emerald-500" },
  dinero: { label: "Pago", chip: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", dot: "bg-amber-500" },
};

/** Todo lo que tiene fecha entre `start` y `end` (inclusive). */
export async function eventsBetween(start: string, end: string, opts: { includeMoney?: boolean } = {}) {
  const [t, i, s, j, c] = await Promise.all([
    db.select().from(tasks).where(and(gte(tasks.dueDate, start), lte(tasks.dueDate, end))),
    db
      .select()
      .from(internships)
      .where(and(gte(internships.deadline, start), lte(internships.deadline, end), notInArray(internships.status, ["rechazado", "descartado", "oferta"]))),
    db
      .select({ step: internshipSteps, company: internships.company, status: internships.status })
      .from(internshipSteps)
      .innerJoin(internships, eq(internships.id, internshipSteps.internshipId))
      .where(and(gte(internshipSteps.dueDate, start), lte(internshipSteps.dueDate, end))),
    db.select().from(jobs).where(and(gte(jobs.nextFollowUp, start), lte(jobs.nextFollowUp, end), notInArray(jobs.status, ["rechazado", "oferta"]))),
    db.select().from(clients).where(and(gte(clients.nextFollowUp, start), lte(clients.nextFollowUp, end), notInArray(clients.stage, ["perdido"]))),
  ]);

  const ev: CalEvent[] = [
    ...t.map((x) => ({ date: x.dueDate!, title: x.title, href: `/pendientes/${x.id}`, kind: "pendiente" as const, done: x.status === "hecho" })),
    ...i.map((x) => ({ date: x.deadline!, title: `Fecha límite: ${x.company}${x.program ? ` · ${x.program}` : ""}`, href: `/internships/${x.id}`, kind: "internship" as const })),
    ...s
      .filter((x) => !["rechazado", "descartado"].includes(x.status))
      .map((x) => ({ date: x.step.dueDate!, title: `${x.company}: ${x.step.title}`, href: `/internships/${x.step.internshipId}`, kind: "internship" as const, done: x.step.done })),
    ...j.map((x) => ({ date: x.nextFollowUp!, title: `Seguimiento: ${x.company}${x.position ? ` (${x.position})` : ""}`, href: `/trabajos/${x.id}`, kind: "trabajo" as const })),
    ...c.map((x) => ({ date: x.nextFollowUp!, title: `Seguimiento: ${x.business || x.name}`, href: `/clientes/${x.id}`, kind: "cliente" as const })),
  ];

  if (opts.includeMoney) {
    const [rec, dbt] = await Promise.all([
      db.select().from(recurring).where(and(eq(recurring.active, true), eq(recurring.type, "gasto"))),
      db.select().from(debts).where(eq(debts.closed, false)),
    ]);
    // Repite cada pago fijo en cada mes del rango.
    for (let m = start.slice(0, 7); m <= end.slice(0, 7); ) {
      const { days } = monthRange(m);
      const at = (d: number) => `${m}-${String(Math.min(d, days)).padStart(2, "0")}`;
      for (const r of rec) ev.push({ date: at(r.dayOfMonth), title: `Pago fijo: ${r.name}`, href: "/finanzas/fijos", kind: "dinero" });
      for (const d of dbt) if (d.dueDay) ev.push({ date: at(d.dueDay), title: `Pagar deuda: ${d.name}`, href: "/finanzas/deudas", kind: "dinero" });
      const [y, mm] = m.split("-").map(Number);
      m = new Date(Date.UTC(y, mm, 1)).toISOString().slice(0, 7);
    }
  }

  return ev.filter((e) => e.date >= start && e.date <= end).sort((a, b) => a.date.localeCompare(b.date) || Number(a.done) - Number(b.done));
}
