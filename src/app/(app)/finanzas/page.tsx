import type { Metadata } from "next";
import Link from "next/link";
import { ResetOnSubmitForm, SubmitButton } from "@/components/client";
import { MonthPicker, parseMonth } from "@/components/month-picker";
import { TxFields } from "@/components/tx-fields";
import { Section, Stat } from "@/components/ui";
import { monthKey, monthLabel, todayISO } from "@/lib/dates";
import { allTimeTotals, byCategory, debtsWithBalance, distinctAccounts, monthSummary, pendingRecurring, trend } from "@/lib/finance";
import { money } from "@/lib/format";
import { requireUid } from "@/lib/auth";
import { applyRecurring, createTransaction } from "./actions";

export const metadata: Metadata = { title: "Finanzas" };

const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);

function Bars({ items, total, color }: { items: { category: string; total: number; n: number }[]; total: number; color: string }) {
  if (!items.length) return <p className="muted text-sm">Sin movimientos este mes.</p>;
  const max = items[0].total;
  return (
    <ul className="space-y-2.5">
      {items.map((c) => (
        <li key={c.category} className="text-sm">
          <div className="mb-1 flex justify-between gap-2">
            <span className="truncate">{c.category}</span>
            <span className="shrink-0 tabular-nums">
              {money(c.total)} <span className="muted text-xs">· {pct(total ? c.total / total : 0)}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(2, (c.total / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const uid = await requireUid();
  const today = todayISO();
  const ym = parseMonth((await searchParams).mes, monthKey(today));
  const [s, expenses, incomes, tr, debts, pending, accounts, all] = await Promise.all([
    monthSummary(uid, ym),
    byCategory(uid, ym, "gasto"),
    byCategory(uid, ym, "ingreso"),
    trend(uid, ym, 12),
    debtsWithBalance(uid),
    pendingRecurring(uid, ym),
    distinctAccounts(uid),
    allTimeTotals(uid),
  ]);
  const openDebts = debts.filter((d) => !d.closed);
  const debtTotal = openDebts.reduce((a, d) => a + d.balance, 0);
  const minPayments = openDebts.reduce((a, d) => a + Number(d.minPayment ?? 0), 0);
  const maxBar = Math.max(1, ...tr.map((t) => Math.max(t.income, t.expense)));
  const avgExpense = tr.filter((t) => t.expense > 0);
  const avg = avgExpense.length ? avgExpense.reduce((a, t) => a + t.expense, 0) / avgExpense.length : 0;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthPicker ym={ym} base="/finanzas" />
        <Link href={`/finanzas/movimientos?mes=${ym}`} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          Ver {s.count} movimientos →
        </Link>
      </div>

      {pending.length > 0 && (
        <form action={applyRecurring} className="card mb-4 flex flex-wrap items-center justify-between gap-3 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <input type="hidden" name="month" value={ym} />
          <span className="text-sm">
            Tienes {pending.length} fijo{pending.length > 1 ? "s" : ""} sin registrar en {monthLabel(ym)}: {pending.map((p) => p.name).join(", ")}.
          </span>
          <SubmitButton>Registrarlos</SubmitButton>
        </form>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos" value={money(s.income)} hint={`Fijos ${money(s.incomeFixed)} · Extras ${money(s.incomeExtra)}`} />
        <Stat label="Gastos" value={money(s.expense)} hint={`Fijos ${money(s.expenseFixed)} · Variables ${money(s.expenseVariable + s.expenseExtra)}`} />
        <Stat label="Te queda" value={money(s.net)} tone={s.net >= 0 ? "good" : "bad"} hint={s.net >= 0 ? "Lo que ahorraste este mes" : "Gastaste más de lo que entró"} />
        <Stat label="Tasa de ahorro" value={pct(s.savingsRate)} tone={(s.savingsRate ?? 0) >= 0.2 ? "good" : (s.savingsRate ?? 0) < 0 ? "bad" : undefined} hint="Meta sana: 20% o más" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ahorro acumulado (histórico)" value={money(all.net)} tone={all.net >= 0 ? "good" : "bad"} />
        <Stat label="Gasto promedio mensual" value={money(avg)} hint="Últimos 12 meses con datos" />
        <Stat label="Deudas pendientes" value={money(debtTotal)} tone={debtTotal > 0 ? "bad" : undefined} hint={`${openDebts.length} activas`} />
        <Stat label="Pagos mínimos al mes" value={money(minPayments)} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="h2 mb-3">¿En qué se me va el dinero?</h2>
          <Bars items={expenses} total={s.expense} color="bg-rose-500" />
        </div>
        <div className="card">
          <h2 className="h2 mb-3">¿De dónde entra?</h2>
          <Bars items={incomes} total={s.income} color="bg-emerald-500" />
        </div>
      </div>

      <Section title="Últimos 12 meses">
        <div className="card">
          <div className="mb-3 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-emerald-500" /> Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-rose-500" /> Gastos
            </span>
          </div>
          <div className="flex h-44 items-end gap-1.5 sm:gap-3">
            {tr.map((t) => (
              <Link
                key={t.month}
                href={`/finanzas?mes=${t.month}`}
                title={`${monthLabel(t.month)}\nIngresos ${money(t.income)}\nGastos ${money(t.expense)}\nNeto ${money(t.income - t.expense)}`}
                className={`flex h-full flex-1 flex-col justify-end rounded-md px-0.5 ${t.month === ym ? "bg-indigo-50 dark:bg-indigo-950/50" : ""}`}
              >
                <div className="flex h-full items-end justify-center gap-0.5">
                  <div className="w-1/2 max-w-4 rounded-t-sm bg-emerald-500" style={{ height: `${(t.income / maxBar) * 100}%` }} />
                  <div className="w-1/2 max-w-4 rounded-t-sm bg-rose-500" style={{ height: `${(t.expense / maxBar) * 100}%` }} />
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5 sm:gap-3">
            {tr.map((t) => (
              <div key={t.month} className="muted flex-1 text-center text-[10px] capitalize sm:text-xs">
                {monthLabel(t.month, true).split(" ")[0]}
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="text-right">Ingresos</th>
                  <th className="text-right">Gastos</th>
                  <th className="text-right">Te quedó</th>
                </tr>
              </thead>
              <tbody>
                {[...tr].reverse().filter((t) => t.income || t.expense).map((t) => (
                  <tr key={t.month}>
                    <td className="capitalize">{monthLabel(t.month)}</td>
                    <td className="text-right tabular-nums">{money(t.income)}</td>
                    <td className="text-right tabular-nums">{money(t.expense)}</td>
                    <td className={`text-right tabular-nums ${t.income - t.expense >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {money(t.income - t.expense)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="Registrar movimiento">
        <ResetOnSubmitForm action={createTransaction} className="card space-y-3">
          <TxFields accounts={accounts} defaultDate={monthKey(today) === ym ? today : `${ym}-01`} />
          <SubmitButton>Agregar</SubmitButton>
        </ResetOnSubmitForm>
      </Section>
    </>
  );
}
