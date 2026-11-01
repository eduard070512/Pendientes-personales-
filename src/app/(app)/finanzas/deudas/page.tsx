import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { debtPayments } from "@/db/schema";
import { ConfirmButton, ResetOnSubmitForm, SubmitButton } from "@/components/client";
import { Badge, Field, Section } from "@/components/ui";
import { fmtDate, todayISO } from "@/lib/dates";
import { debtsWithBalance } from "@/lib/finance";
import { money } from "@/lib/format";
import { requireUid } from "@/lib/auth";
import { addDebtPayment, createDebt, deleteDebt, deleteDebtPayment, updateDebt } from "../actions";

export const metadata: Metadata = { title: "Deudas" };

type D = Awaited<ReturnType<typeof debtsWithBalance>>[number];

function DebtFields({ d }: { d?: D }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label="Deuda" className="sm:col-span-3">
        <input name="name" required className="input" defaultValue={d?.name} placeholder="Tarjeta BBVA, préstamo…" />
      </Field>
      <Field label="A quién / banco" className="sm:col-span-3">
        <input name="lender" className="input" defaultValue={d?.lender} />
      </Field>
      <Field label="Monto total" className="sm:col-span-2">
        <input name="total" inputMode="decimal" required className="input" defaultValue={d?.total} />
      </Field>
      <Field label="Pago mínimo / mensual" className="sm:col-span-2">
        <input name="minPayment" inputMode="decimal" className="input" defaultValue={d?.minPayment ?? ""} />
      </Field>
      <Field label="Día de pago">
        <input name="dueDay" type="number" min={1} max={31} className="input" defaultValue={d?.dueDay ?? ""} />
      </Field>
      <Field label="Interés anual %">
        <input name="interestRate" inputMode="decimal" className="input" defaultValue={d?.interestRate ?? ""} />
      </Field>
      <Field label="Notas" className="sm:col-span-6">
        <input name="notes" className="input" defaultValue={d?.notes} />
      </Field>
      {d && (
        <label className="flex items-center gap-2 text-sm sm:col-span-6">
          <input type="checkbox" name="closed" defaultChecked={d.closed} /> Liquidada
        </label>
      )}
    </div>
  );
}

export default async function DebtsPage() {
  const uid = await requireUid();
  const list = await debtsWithBalance(uid);
  const payments = await db.select().from(debtPayments).where(eq(debtPayments.userId, uid)).orderBy(desc(debtPayments.date), desc(debtPayments.id));
  const open = list.filter((d) => !d.closed);
  const total = open.reduce((a, d) => a + d.balance, 0);
  const monthly = open.reduce((a, d) => a + Number(d.minPayment ?? 0), 0);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card">
          <div className="muted text-xs">Debes en total</div>
          <div className="text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">{money(total)}</div>
        </div>
        <div className="card">
          <div className="muted text-xs">Pagos mensuales</div>
          <div className="text-xl font-semibold tabular-nums">{money(monthly)}</div>
        </div>
      </div>

      <Section title="Mis deudas">
        <div className="mb-4 space-y-3">
          {list.length === 0 && <div className="card muted py-6 text-center text-sm">Sin deudas registradas. 🎉</div>}
          {list.map((d) => {
            const ps = payments.filter((p) => p.debtId === d.id);
            const progress = Number(d.total) > 0 ? Math.min(1, d.paid / Number(d.total)) : 0;
            const months = d.minPayment && Number(d.minPayment) > 0 ? Math.ceil(d.balance / Number(d.minPayment)) : null;
            return (
              <div key={d.id} className={`card ${d.closed ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{d.name}</div>
                    <div className="muted text-xs">
                      {d.lender}
                      {d.dueDay ? ` · paga el día ${d.dueDay}` : ""}
                      {d.interestRate ? ` · ${d.interestRate}% anual` : ""}
                    </div>
                  </div>
                  {d.closed ? <Badge tone="green">Liquidada</Badge> : <div className="text-right font-semibold tabular-nums">{money(d.balance)}</div>}
                </div>
                <div className="mt-3 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="muted mt-1 text-xs">
                  Pagado {money(d.paid)} de {money(d.total)} ({Math.round(progress * 100)}%)
                  {!d.closed && months ? ` · ~${months} mes${months > 1 ? "es" : ""} pagando ${money(d.minPayment)}` : ""}
                </div>

                {!d.closed && (
                  <ResetOnSubmitForm action={addDebtPayment} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="debtId" value={d.id} />
                    <label>
                      <span className="label">Abono</span>
                      <input name="amount" inputMode="decimal" required className="input w-28" defaultValue={d.minPayment ?? ""} />
                    </label>
                    <label>
                      <span className="label">Fecha</span>
                      <input name="date" type="date" className="input w-auto" defaultValue={todayISO()} />
                    </label>
                    <label className="flex items-center gap-1.5 pb-2 text-xs">
                      <input type="checkbox" name="asExpense" defaultChecked /> Contar como gasto
                    </label>
                    <SubmitButton>Registrar pago</SubmitButton>
                  </ResetOnSubmitForm>
                )}

                <details className="mt-3">
                  <summary className="muted cursor-pointer text-xs">Pagos ({ps.length}) y editar</summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {ps.map((p) => (
                      <li key={p.id} className="flex items-center gap-3">
                        <span className="muted w-20 text-xs">{fmtDate(p.date, true)}</span>
                        <span className="flex-1 tabular-nums">{money(p.amount)}</span>
                        <form action={deleteDebtPayment}>
                          <input type="hidden" name="id" value={p.id} />
                          <ConfirmButton message="¿Borrar este pago?" className="btn-danger px-2 py-0.5 text-xs">
                            ✕
                          </ConfirmButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <form action={updateDebt} className="mt-3 space-y-3">
                    <input type="hidden" name="id" value={d.id} />
                    <DebtFields d={d} />
                    <SubmitButton>Guardar</SubmitButton>
                  </form>
                  <form action={deleteDebt} className="mt-2">
                    <input type="hidden" name="id" value={d.id} />
                    <ConfirmButton message="¿Borrar esta deuda y sus pagos?">Borrar deuda</ConfirmButton>
                  </form>
                </details>
              </div>
            );
          })}
        </div>
        <ResetOnSubmitForm action={createDebt} className="card space-y-3">
          <div className="text-sm font-medium">＋ Nueva deuda</div>
          <DebtFields />
          <SubmitButton>Agregar</SubmitButton>
        </ResetOnSubmitForm>
      </Section>
    </>
  );
}
