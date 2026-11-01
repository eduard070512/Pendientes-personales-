import type { Metadata } from "next";
import Link from "next/link";
import { ResetOnSubmitForm, SubmitButton } from "@/components/client";
import { MonthPicker, parseMonth } from "@/components/month-picker";
import { PageHeader } from "@/components/ui";
import { fmtDate, monthKey, monthRange, todayISO } from "@/lib/dates";
import { KIND_STYLE, eventsBetween, type CalEvent } from "@/lib/events";
import { requireUid } from "@/lib/auth";
import { createTask } from "../pendientes/actions";

export const metadata: Metadata = { title: "Calendario" };

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ mes?: string; pagos?: string }> }) {
  const uid = await requireUid();
  const sp = await searchParams;
  const today = todayISO();
  const ym = parseMonth(sp.mes, monthKey(today));
  const showMoney = sp.pagos !== "0";
  const { start, end, days } = monthRange(ym);
  const events = await eventsBetween(uid, start, end, { includeMoney: showMoney });
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);

  const firstWeekday = (new Date(`${start}T12:00:00Z`).getUTCDay() + 6) % 7; // lunes = 0
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7) cells.push(null);

  const agenda = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <PageHeader title="Calendario" subtitle="Pendientes, internships, seguimientos de trabajos y clientes, y pagos" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthPicker ym={ym} base="/calendario" />
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {Object.entries(KIND_STYLE).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`size-2 rounded-full ${v.dot}`} /> {v.label}
            </span>
          ))}
          <Link href={`/calendario?mes=${ym}${showMoney ? "&pagos=0" : ""}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
            {showMoney ? "Ocultar pagos" : "Mostrar pagos"}
          </Link>
        </div>
      </div>

      <div className="card mb-6 overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-zinc-200 text-center text-xs font-medium dark:border-zinc-800">
          {WEEKDAYS.map((d) => (
            <div key={d} className="muted py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const list = d ? byDay.get(d) ?? [] : [];
            const isToday = d === today;
            return (
              <div key={i} className={`min-h-16 border-b border-r border-zinc-100 p-1 sm:min-h-24 dark:border-zinc-800/60 ${d ? "" : "bg-zinc-50 dark:bg-zinc-950/40"}`}>
                {d && (
                  <a href={list.length ? `#d-${d}` : undefined} className="block">
                    <div className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-indigo-600 font-semibold text-white" : "muted"}`}>
                      {Number(d.slice(8))}
                    </div>
                    <div className="flex flex-wrap gap-0.5 sm:hidden">
                      {list.slice(0, 6).map((e, k) => (
                        <span key={k} className={`size-1.5 rounded-full ${KIND_STYLE[e.kind].dot} ${e.done ? "opacity-30" : ""}`} />
                      ))}
                    </div>
                    <div className="hidden space-y-0.5 sm:block">
                      {list.slice(0, 3).map((e, k) => (
                        <div key={k} className={`truncate rounded px-1 py-0.5 text-[11px] ${KIND_STYLE[e.kind].chip} ${e.done ? "line-through opacity-50" : ""}`}>
                          {e.title}
                        </div>
                      ))}
                      {list.length > 3 && <div className="muted px-1 text-[11px]">+{list.length - 3} más</div>}
                    </div>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="h2 mb-2">Agenda del mes</h2>
          {agenda.length === 0 ? (
            <p className="card muted text-sm">Nada programado este mes.</p>
          ) : (
            <div className="space-y-3">
              {agenda.map(([d, list]) => (
                <div key={d} id={`d-${d}`} className="card scroll-mt-20">
                  <div className={`mb-2 text-sm font-semibold ${d === today ? "text-indigo-600 dark:text-indigo-400" : d < today ? "muted" : ""}`}>
                    {fmtDate(d, true)}
                    {d === today && " · hoy"}
                  </div>
                  <ul className="space-y-1.5">
                    {list.map((e, k) => (
                      <li key={k}>
                        <Link href={e.href} className="flex items-center gap-2 text-sm hover:underline">
                          <span className={`size-2 shrink-0 rounded-full ${KIND_STYLE[e.kind].dot}`} />
                          <span className={e.done ? "muted line-through" : ""}>{e.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
        <aside>
          <h2 className="h2 mb-2">Agregar pendiente</h2>
          <ResetOnSubmitForm action={createTask} className="card space-y-3">
            <input name="title" className="input" required placeholder="¿Qué tienes que hacer?" />
            <input name="dueDate" type="date" className="input" defaultValue={monthKey(today) === ym ? today : start} />
            <input type="hidden" name="priority" value="media" />
            <SubmitButton>Agregar</SubmitButton>
          </ResetOnSubmitForm>
        </aside>
      </div>
    </>
  );
}
