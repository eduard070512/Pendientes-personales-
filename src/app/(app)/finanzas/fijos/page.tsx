import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recurring } from "@/db/schema";
import { ConfirmButton, ResetOnSubmitForm, SubmitButton } from "@/components/client";
import { parseMonth } from "@/components/month-picker";
import { Badge, Field, Section, Select } from "@/components/ui";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { monthKey, monthLabel, todayISO } from "@/lib/dates";
import { pendingRecurring } from "@/lib/finance";
import { money } from "@/lib/format";
import { requireUid } from "@/lib/auth";
import { applyRecurring, createRecurring, deleteRecurring, updateRecurring } from "../actions";

export const metadata: Metadata = { title: "Fijos" };

type R = typeof recurring.$inferSelect;

function RecFields({ r }: { r?: R }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label="Nombre" className="sm:col-span-2">
        <input name="name" required className="input" defaultValue={r?.name} placeholder="Renta, Sueldo, Spotify…" />
      </Field>
      <Field label="Tipo">
        <Select name="type" options={[{ value: "gasto", label: "Gasto" }, { value: "ingreso", label: "Ingreso" }]} defaultValue={r?.type ?? "gasto"} />
      </Field>
      <Field label="Monto">
        <input name="amount" inputMode="decimal" required className="input" defaultValue={r?.amount} />
      </Field>
      <Field label="Día del mes">
        <input name="dayOfMonth" type="number" min={1} max={31} className="input" defaultValue={r?.dayOfMonth ?? 1} />
      </Field>
      <Field label="Categoría">
        <input name="category" className="input" list="rec-cats" defaultValue={r?.category} />
        <datalist id="rec-cats">
          {[...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Cuenta" className="sm:col-span-2">
        <input name="account" className="input" defaultValue={r?.account} />
      </Field>
      {r && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2 sm:pt-6">
          <input type="checkbox" name="active" defaultChecked={r.active} /> Activo
        </label>
      )}
    </div>
  );
}

export default async function RecurringPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const uid = await requireUid();
  const ym = parseMonth((await searchParams).mes, monthKey(todayISO()));
  const items = await db.select().from(recurring).where(eq(recurring.userId, uid)).orderBy(desc(recurring.active), asc(recurring.type), asc(recurring.dayOfMonth));
  const pending = await pendingRecurring(uid, ym);
  const active = items.filter((i) => i.active);
  const inc = active.filter((i) => i.type === "ingreso").reduce((a, i) => a + Number(i.amount), 0);
  const exp = active.filter((i) => i.type === "gasto").reduce((a, i) => a + Number(i.amount), 0);

  return (
    <>
      <p className="muted mb-4 text-sm">
        Tus ingresos y gastos que se repiten cada mes. Con un clic los registras en el mes; no se duplican si ya están.
      </p>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="card">
          <div className="muted text-xs">Ingresos fijos</div>
          <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{money(inc)}</div>
        </div>
        <div className="card">
          <div className="muted text-xs">Gastos fijos</div>
          <div className="font-semibold tabular-nums">{money(exp)}</div>
        </div>
        <div className="card">
          <div className="muted text-xs">Libre al mes</div>
          <div className={`font-semibold tabular-nums ${inc - exp >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{money(inc - exp)}</div>
        </div>
      </div>

      {pending.length > 0 && (
        <form action={applyRecurring} className="card mb-4 flex flex-wrap items-center justify-between gap-3">
          <input type="hidden" name="month" value={ym} />
          <span className="text-sm">
            {pending.length} sin registrar en <span className="capitalize">{monthLabel(ym)}</span>
          </span>
          <SubmitButton>Registrar en {monthLabel(ym)}</SubmitButton>
        </form>
      )}

      <Section title="Mis fijos">
        <ul className="card mb-3 divide-y divide-zinc-100 p-0 dark:divide-zinc-800/60">
          {items.length === 0 && <li className="muted px-4 py-6 text-center text-sm">Agrega tu sueldo, renta, suscripciones…</li>}
          {items.map((r) => (
            <li key={r.id}>
              <details>
                <summary className={`flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 ${r.active ? "" : "opacity-50"}`}>
                  <span className="muted w-14 shrink-0 text-xs">Día {r.dayOfMonth}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {r.name} <span className="muted text-xs">· {r.category}</span>
                  </span>
                  {!r.active && <Badge>Pausado</Badge>}
                  <span className={`text-sm font-medium tabular-nums ${r.type === "ingreso" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                    {r.type === "ingreso" ? "+" : "−"}
                    {money(r.amount)}
                  </span>
                </summary>
                <div className="space-y-3 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <form action={updateRecurring} className="space-y-3">
                    <input type="hidden" name="id" value={r.id} />
                    <RecFields r={r} />
                    <SubmitButton>Guardar</SubmitButton>
                  </form>
                  <form action={deleteRecurring}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmButton message="¿Borrar este fijo? Los movimientos ya registrados se quedan.">Borrar</ConfirmButton>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <ResetOnSubmitForm action={createRecurring} className="card space-y-3">
          <div className="text-sm font-medium">＋ Nuevo fijo</div>
          <RecFields />
          <SubmitButton>Agregar</SubmitButton>
        </ResetOnSubmitForm>
      </Section>
    </>
  );
}
