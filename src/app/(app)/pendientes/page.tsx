import type { Metadata } from "next";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { ResetOnSubmitForm, SubmitButton } from "@/components/client";
import { TaskFields } from "@/components/task-fields";
import { TaskRow, type TaskRowData } from "@/components/task-row";
import { Empty, PageHeader, Tabs } from "@/components/ui";
import { addDays, todayISO } from "@/lib/dates";
import { createTask } from "./actions";

export const metadata: Metadata = { title: "Pendientes" };

function group(list: TaskRowData[]) {
  const today = todayISO();
  const week = addDays(today, 7);
  const g = { Vencidos: [] as TaskRowData[], Hoy: [] as TaskRowData[], "Próximos 7 días": [] as TaskRowData[], Después: [] as TaskRowData[], "Sin fecha": [] as TaskRowData[] };
  for (const t of list) {
    if (!t.dueDate) g["Sin fecha"].push(t);
    else if (t.dueDate < today) g.Vencidos.push(t);
    else if (t.dueDate === today) g.Hoy.push(t);
    else if (t.dueDate <= week) g["Próximos 7 días"].push(t);
    else g.Después.push(t);
  }
  return Object.entries(g).filter(([, v]) => v.length);
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ ver?: string; cat?: string }> }) {
  const { ver = "activos", cat } = await searchParams;
  const where = ver === "hechos" ? eq(tasks.status, "hecho") : ver === "todos" ? undefined : ne(tasks.status, "hecho");
  const rows = await db
    .select()
    .from(tasks)
    .where(and(where, cat ? eq(tasks.category, cat) : undefined))
    .orderBy(ver === "hechos" ? desc(tasks.completedAt) : sql`${tasks.dueDate} asc nulls last`, asc(tasks.createdAt));
  const cats = (await db.selectDistinct({ c: tasks.category }).from(tasks).where(ne(tasks.category, ""))).map((r) => r.c).sort();
  const q = (v: string) => `/pendientes?ver=${v}${cat ? `&cat=${encodeURIComponent(cat)}` : ""}`;

  return (
    <>
      <PageHeader title="Pendientes" subtitle={`${rows.length} ${ver === "hechos" ? "terminados" : "en la lista"}`} />

      <details className="card mb-5" open={rows.length === 0}>
        <summary className="cursor-pointer text-sm font-medium">＋ Nuevo pendiente</summary>
        <ResetOnSubmitForm action={createTask} className="mt-3 space-y-3">
          <TaskFields categories={cats} />
          <SubmitButton>Agregar</SubmitButton>
        </ResetOnSubmitForm>
      </details>

      <Tabs
        active={ver}
        items={[
          { key: "activos", label: "Activos", href: q("activos") },
          { key: "hechos", label: "Hechos", href: q("hechos") },
          { key: "todos", label: "Todos", href: q("todos") },
        ]}
      />
      {cats.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
          <a href={`/pendientes?ver=${ver}`} className={`rounded-full px-2.5 py-1 ${!cat ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
            Todas
          </a>
          {cats.map((c) => (
            <a
              key={c}
              href={`/pendientes?ver=${ver}&cat=${encodeURIComponent(c)}`}
              className={`rounded-full px-2.5 py-1 ${cat === c ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}
            >
              {c}
            </a>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <Empty>No hay pendientes aquí.</Empty>
      ) : ver === "activos" ? (
        group(rows).map(([name, list]) => (
          <div key={name} className="card mb-4 py-1">
            <div className={`pt-2 text-xs font-semibold uppercase tracking-wide ${name === "Vencidos" ? "text-red-600 dark:text-red-400" : "muted"}`}>
              {name} · {list.length}
            </div>
            <ul>
              {list.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </ul>
          </div>
        ))
      ) : (
        <ul className="card py-1">
          {rows.map((t) => (
            <TaskRow key={t.id} t={t} />
          ))}
        </ul>
      )}
    </>
  );
}
