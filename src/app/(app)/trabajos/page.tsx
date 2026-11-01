import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { SubmitButton } from "@/components/client";
import { JobFields } from "@/components/job-fields";
import { Badge, Empty, PageHeader, Tabs } from "@/components/ui";
import { JOB_STATUS, opt } from "@/lib/constants";
import { daysUntil, fmtDate, relDay } from "@/lib/dates";
import { createJob } from "./actions";

export const metadata: Metadata = { title: "Trabajos" };

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = "todos" } = await searchParams;
  const counts = await db.select({ status: jobs.status, n: sql<number>`count(*)` }).from(jobs).groupBy(jobs.status);
  const total = counts.reduce((a, c) => a + Number(c.n), 0);
  const list = await db
    .select()
    .from(jobs)
    .where(estado === "todos" ? undefined : eq(jobs.status, estado))
    .orderBy(sql`${jobs.nextFollowUp} asc nulls last`, desc(jobs.updatedAt));

  return (
    <>
      <PageHeader title="Trabajos" subtitle="Vacantes posibles, CVs enviados y seguimiento" />

      <details className="card mb-5" open={total === 0}>
        <summary className="cursor-pointer text-sm font-medium">＋ Registrar vacante</summary>
        <form action={createJob} className="mt-3 space-y-3">
          <JobFields />
          <SubmitButton>Agregar</SubmitButton>
        </form>
      </details>

      <Tabs
        active={estado}
        items={[
          { key: "todos", label: `Todos (${total})`, href: "/trabajos" },
          ...JOB_STATUS.map((s) => ({
            key: s.value,
            label: `${s.label} (${counts.find((c) => c.status === s.value)?.n ?? 0})`,
            href: `/trabajos?estado=${s.value}`,
          })),
        ]}
      />

      {list.length === 0 ? (
        <Empty>No hay vacantes aquí.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="tbl">
            <thead>
              <tr>
                <th className="pl-4">Empresa</th>
                <th>Estado</th>
                <th className="hidden sm:table-cell">Fuente</th>
                <th className="hidden sm:table-cell">Apliqué</th>
                <th className="pr-4">Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {list.map((j) => {
                const s = opt(JOB_STATUS, j.status);
                return (
                  <tr key={j.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="pl-4">
                      <Link href={`/trabajos/${j.id}`} className="font-medium hover:underline">
                        {j.company}
                      </Link>
                      <div className="muted text-xs">
                        {j.position}
                        {j.salary && ` · ${j.salary}`}
                      </div>
                    </td>
                    <td>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </td>
                    <td className="muted hidden sm:table-cell">{j.source}</td>
                    <td className="muted hidden sm:table-cell">{fmtDate(j.appliedAt)}</td>
                    <td className="pr-4">
                      {j.nextFollowUp && (
                        <span className={daysUntil(j.nextFollowUp) <= 0 ? "font-medium text-red-600 dark:text-red-400" : "muted"}>
                          {fmtDate(j.nextFollowUp)} <span className="text-xs">({relDay(j.nextFollowUp)})</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
