import Link from "next/link";
import { and, eq, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { classroomItems, tasks } from "@/db/schema";
import { ResetOnSubmitForm, SubmitButton } from "@/components/client";
import { TaskRow } from "@/components/task-row";
import { Stat } from "@/components/ui";
import { addDays, fmtDate, monthKey, monthLabel, relDay, todayISO } from "@/lib/dates";
import { KIND_STYLE, eventsBetween } from "@/lib/events";
import { monthSummary } from "@/lib/finance";
import { money } from "@/lib/format";
import { logout } from "../login/actions";
import { createTask } from "./pendientes/actions";

export default async function Home() {
  const today = todayISO();
  const [urgent, noDate, upcoming, fin, school] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(ne(tasks.status, "hecho"), lte(tasks.dueDate, today)))
      .orderBy(tasks.dueDate),
    db
      .select()
      .from(tasks)
      .where(and(ne(tasks.status, "hecho"), sql`${tasks.dueDate} is null`))
      .orderBy(sql`case ${tasks.priority} when 'alta' then 0 when 'media' then 1 else 2 end`, tasks.createdAt)
      .limit(5),
    eventsBetween(addDays(today, 1), addDays(today, 14)),
    monthSummary(monthKey(today)),
    db
      .select()
      .from(classroomItems)
      .where(
        and(
          eq(classroomItems.state, "pendiente"),
          eq(classroomItems.hidden, false),
          isNull(classroomItems.taskId),
          lte(classroomItems.dueDate, addDays(today, 1)),
        ),
      )
      .orderBy(classroomItems.dueDate),
  ]);
  const upcomingOpen = upcoming.filter((e) => !e.done);

  return (
    <>
      <div className="mb-5">
        <h1 className="h1">Hola, Eduardo 👋</h1>
        <p className="muted text-sm">
          Hoy es {fmtDate(today, true)}. {urgent.length ? `Tienes ${urgent.length} pendiente${urgent.length > 1 ? "s" : ""} para hoy o atrasados.` : "Nada urgente para hoy."}
        </p>
      </div>

      <ResetOnSubmitForm action={createTask} className="card mb-6 flex flex-wrap gap-2">
        <input name="title" className="input min-w-48 flex-1" required placeholder="Agregar pendiente rápido…" />
        <input name="dueDate" type="date" className="input w-auto" defaultValue={today} />
        <SubmitButton>Agregar</SubmitButton>
      </ResetOnSubmitForm>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="h2">Hoy y atrasados</h2>
            <Link href="/pendientes" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
              Todos →
            </Link>
          </div>
          {urgent.length === 0 && school.length === 0 ? (
            <p className="muted py-3 text-sm">¡Al día! 🎉</p>
          ) : (
            <ul>
              {urgent.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </ul>
          )}
          {school.length > 0 && (
            <>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">Classroom: hoy, mañana o atrasadas</div>
              <ul className="space-y-1.5 py-2">
                {school.map((c) => (
                  <li key={c.id}>
                    <Link href="/classroom" className="flex items-start gap-2 text-sm hover:underline">
                      <span aria-hidden>📚</span>
                      <span className="min-w-0 flex-1">
                        {c.title} <span className="muted text-xs">· {c.courseName}</span>
                      </span>
                      <span className={`shrink-0 text-xs ${c.dueDate! < today ? "text-red-600 dark:text-red-400" : "muted"}`}>
                        {relDay(c.dueDate)}
                        {c.dueTime ? ` ${c.dueTime}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {noDate.length > 0 && (
            <>
              <div className="muted mt-3 text-xs font-semibold uppercase tracking-wide">Sin fecha</div>
              <ul>
                {noDate.map((t) => (
                  <TaskRow key={t.id} t={t} />
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="h2">Próximas 2 semanas</h2>
            <Link href="/calendario" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
              Calendario →
            </Link>
          </div>
          {upcomingOpen.length === 0 ? (
            <p className="muted py-3 text-sm">Nada programado.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingOpen.slice(0, 12).map((e, i) => (
                <li key={i}>
                  <Link href={e.href} className="flex items-start gap-2 text-sm hover:underline">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${KIND_STYLE[e.kind].dot}`} />
                    <span className="min-w-0 flex-1">{e.title}</span>
                    <span className="muted shrink-0 text-xs">
                      {fmtDate(e.date)} · {relDay(e.date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="h2 capitalize">Dinero · {monthLabel(monthKey(today))}</h2>
        <Link href="/finanzas" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          Finanzas →
        </Link>
      </div>
      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat label="Entró" value={money(fin.income)} />
        <Stat label="Salió" value={money(fin.expense)} />
        <Stat label="Te queda" value={money(fin.net)} tone={fin.net >= 0 ? "good" : "bad"} />
      </div>

      <form action={logout} className="md:hidden">
        <button className="btn-secondary w-full">Cerrar sesión</button>
      </form>
    </>
  );
}
