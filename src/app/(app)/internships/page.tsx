import type { Metadata } from "next";
import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { internshipSteps, internships } from "@/db/schema";
import { SubmitButton } from "@/components/client";
import { InternshipFields } from "@/components/internship-fields";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { INTERNSHIP_STATUS, opt } from "@/lib/constants";
import { daysUntil, fmtDate, relDay } from "@/lib/dates";
import { createInternship, seedInternships } from "./actions";

export const metadata: Metadata = { title: "Internships" };

const CLOSED = ["rechazado", "descartado", "oferta"];

export default async function InternshipsPage() {
  const list = await db.select().from(internships).orderBy(sql`${internships.deadline} asc nulls last`, asc(internships.company));
  const steps = await db.select().from(internshipSteps).orderBy(asc(internshipSteps.position));
  const byI = new Map<number, typeof steps>();
  for (const s of steps) byI.set(s.internshipId, [...(byI.get(s.internshipId) ?? []), s]);

  const active = list.filter((i) => !CLOSED.includes(i.status));
  const closed = list.filter((i) => CLOSED.includes(i.status));

  const card = (i: (typeof list)[number]) => {
    const st = byI.get(i.id) ?? [];
    const done = st.filter((s) => s.done).length;
    const next = st.find((s) => !s.done);
    const status = opt(INTERNSHIP_STATUS, i.status);
    const urgent = i.deadline && !CLOSED.includes(i.status) && daysUntil(i.deadline) <= 7;
    return (
      <Link key={i.id} href={`/internships/${i.id}`} className="card block transition hover:border-indigo-400">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold">{i.company}</div>
            <div className="muted truncate text-sm">{i.program}</div>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <div className="muted mt-2 flex flex-wrap gap-x-3 text-xs">
          {i.modality && <span>{i.modality}</span>}
          {i.location && <span>{i.location}</span>}
          {i.deadline && (
            <span className={urgent ? "font-medium text-red-600 dark:text-red-400" : ""}>
              Límite {fmtDate(i.deadline)} ({relDay(i.deadline)})
            </span>
          )}
        </div>
        {st.length > 0 && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div className="h-full bg-indigo-500" style={{ width: `${(done / st.length) * 100}%` }} />
            </div>
            <div className="muted mt-1 text-xs">
              {done}/{st.length} pasos{next ? ` · Sigue: ${next.title}` : " · ¡Todo listo!"}
            </div>
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      <PageHeader title="Internships" subtitle={`${active.length} activos · ${closed.length} cerrados`} />

      <details className="card mb-5">
        <summary className="cursor-pointer text-sm font-medium">＋ Nuevo internship</summary>
        <form action={createInternship} className="mt-3 space-y-3">
          <InternshipFields />
          <SubmitButton>Agregar</SubmitButton>
        </form>
      </details>

      {list.length === 0 ? (
        <Empty>
          <p className="mb-3">Aún no tienes internships registrados.</p>
          <form action={seedInternships}>
            <SubmitButton pendingText="Cargando…">Cargar mi plan 2026–2027 (Microsoft, Oracle, GSoC…)</SubmitButton>
          </form>
        </Empty>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">{active.map(card)}</div>
          {closed.length > 0 && (
            <>
              <h2 className="h2 mb-2 mt-8">Cerrados</h2>
              <div className="grid gap-3 opacity-80 sm:grid-cols-2">{closed.map(card)}</div>
            </>
          )}
        </>
      )}
    </>
  );
}
