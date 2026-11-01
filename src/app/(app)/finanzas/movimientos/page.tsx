import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { ConfirmButton, ResetOnSubmitForm, SubmitButton } from "@/components/client";
import { MonthPicker, parseMonth } from "@/components/month-picker";
import { TxFields } from "@/components/tx-fields";
import { Badge, Empty } from "@/components/ui";
import { TX_KIND, opt } from "@/lib/constants";
import { fmtDate, monthKey, monthRange, todayISO } from "@/lib/dates";
import { distinctAccounts } from "@/lib/finance";
import { money } from "@/lib/format";
import { requireUid } from "@/lib/auth";
import { createTransaction, deleteTransaction, updateTransaction } from "../actions";

export const metadata: Metadata = { title: "Movimientos" };

export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ mes?: string; tipo?: string; cat?: string; cuenta?: string }> }) {
  const uid = await requireUid();
  const sp = await searchParams;
  const today = todayISO();
  const ym = parseMonth(sp.mes, monthKey(today));
  const { start, end } = monthRange(ym);
  const all = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, uid), gte(transactions.date, start), lte(transactions.date, end)))
    .orderBy(desc(transactions.date), desc(transactions.id));
  const accounts = await distinctAccounts(uid);
  const list = all.filter(
    (t) => (!sp.tipo || t.type === sp.tipo) && (!sp.cat || t.category === sp.cat) && (!sp.cuenta || t.account === sp.cuenta),
  );
  const cats = [...new Set(all.map((t) => t.category))].sort();
  const sum = (type: string) => list.filter((t) => t.type === type).reduce((a, t) => a + Number(t.amount), 0);
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { mes: ym, tipo: sp.tipo, cat: sp.cat, cuenta: sp.cuenta, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/finanzas/movimientos?${p}`;
  };
  const chip = (active: boolean) => `rounded-full px-2.5 py-1 text-xs ${active ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthPicker ym={ym} base="/finanzas/movimientos" />
        <div className="text-sm tabular-nums">
          <span className="text-emerald-600 dark:text-emerald-400">+{money(sum("ingreso"))}</span>
          {" · "}
          <span className="text-rose-600 dark:text-rose-400">−{money(sum("gasto"))}</span>
        </div>
      </div>

      <details className="card mb-4">
        <summary className="cursor-pointer text-sm font-medium">＋ Registrar movimiento</summary>
        <ResetOnSubmitForm action={createTransaction} className="mt-3 space-y-3">
          <TxFields accounts={accounts} defaultDate={monthKey(today) === ym ? today : `${ym}-01`} />
          <SubmitButton>Agregar</SubmitButton>
        </ResetOnSubmitForm>
      </details>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href={link({ tipo: undefined })} className={chip(!sp.tipo)}>Todo</Link>
        <Link href={link({ tipo: "gasto" })} className={chip(sp.tipo === "gasto")}>Gastos</Link>
        <Link href={link({ tipo: "ingreso" })} className={chip(sp.tipo === "ingreso")}>Ingresos</Link>
        <span className="mx-1 border-l border-zinc-300 dark:border-zinc-700" />
        {cats.map((c) => (
          <Link key={c} href={link({ cat: sp.cat === c ? undefined : c })} className={chip(sp.cat === c)}>
            {c}
          </Link>
        ))}
        {accounts.length > 1 && <span className="mx-1 border-l border-zinc-300 dark:border-zinc-700" />}
        {accounts.length > 1 &&
          accounts.map((a) => (
            <Link key={a} href={link({ cuenta: sp.cuenta === a ? undefined : a })} className={chip(sp.cuenta === a)}>
              💳 {a}
            </Link>
          ))}
      </div>

      {list.length === 0 ? (
        <Empty>No hay movimientos con estos filtros.</Empty>
      ) : (
        <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800/60">
          {list.map((t) => (
            <li key={t.id}>
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="muted w-12 shrink-0 text-xs">{fmtDate(t.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{t.description}</span>
                    <span className="muted flex flex-wrap gap-x-2 text-xs">
                      <span>{t.category}</span>
                      {t.account && <span>· {t.account}</span>}
                      {t.kind !== "variable" && <Badge tone={opt(TX_KIND, t.kind).tone}>{opt(TX_KIND, t.kind).label}</Badge>}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm font-medium tabular-nums ${t.type === "ingreso" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                    {t.type === "ingreso" ? "+" : "−"}
                    {money(t.amount)}
                  </span>
                </summary>
                <div className="space-y-3 border-t border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <form action={updateTransaction} className="space-y-3">
                    <input type="hidden" name="id" value={t.id} />
                    <TxFields t={t} accounts={accounts} defaultDate={t.date} />
                    <SubmitButton>Guardar</SubmitButton>
                  </form>
                  <form action={deleteTransaction}>
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmButton message="¿Borrar este movimiento?">Borrar</ConfirmButton>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
