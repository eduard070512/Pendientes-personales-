"use server";

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { debtPayments, debts, recurring, statements, transactions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { monthRange, todayISO } from "@/lib/dates";
import { id, optDate, optInt, optMoney, str } from "@/lib/format";

function refresh() {
  revalidatePath("/finanzas", "layout");
  revalidatePath("/calendario");
  revalidatePath("/");
}

function txType(v: string) {
  return v === "ingreso" ? "ingreso" : "gasto";
}

function txFields(fd: FormData) {
  const amount = optMoney(fd, "amount");
  return {
    date: optDate(fd, "date") ?? todayISO(),
    description: str(fd, "description"),
    amount: amount ? Math.abs(Number(amount)).toFixed(2) : null,
    type: txType(str(fd, "type")),
    kind: ["fijo", "variable", "extra"].includes(str(fd, "kind")) ? str(fd, "kind") : "variable",
    category: str(fd, "category") || "Otros",
    account: str(fd, "account"),
  };
}

/* ───────────── Movimientos ───────────── */

export async function createTransaction(fd: FormData) {
  await requireAuth();
  const { amount, ...rest } = txFields(fd);
  if (!amount || !rest.description) return;
  await db.insert(transactions).values({ ...rest, amount });
  refresh();
}

export async function updateTransaction(fd: FormData) {
  await requireAuth();
  const { amount, ...rest } = txFields(fd);
  if (!amount || !rest.description) return;
  await db.update(transactions).set({ ...rest, amount }).where(eq(transactions.id, id(fd)));
  refresh();
}

export async function deleteTransaction(fd: FormData) {
  await requireAuth();
  await db.delete(transactions).where(eq(transactions.id, id(fd)));
  refresh();
}

/* ───────────── Fijos ───────────── */

function recFields(fd: FormData) {
  return {
    name: str(fd, "name"),
    type: txType(str(fd, "type")),
    amount: optMoney(fd, "amount"),
    category: str(fd, "category") || "Otros",
    account: str(fd, "account"),
    dayOfMonth: Math.min(31, Math.max(1, optInt(fd, "dayOfMonth") ?? 1)),
    active: fd.get("active") !== null,
  };
}

export async function createRecurring(fd: FormData) {
  await requireAuth();
  const { amount, ...rest } = recFields(fd);
  if (!rest.name || !amount) return;
  await db.insert(recurring).values({ ...rest, amount: Math.abs(Number(amount)).toFixed(2), active: true });
  refresh();
}

export async function updateRecurring(fd: FormData) {
  await requireAuth();
  const { amount, ...rest } = recFields(fd);
  if (!rest.name || !amount) return;
  await db.update(recurring).set({ ...rest, amount: Math.abs(Number(amount)).toFixed(2) }).where(eq(recurring.id, id(fd)));
  refresh();
}

export async function deleteRecurring(fd: FormData) {
  await requireAuth();
  await db.delete(recurring).where(eq(recurring.id, id(fd)));
  refresh();
}

/** Crea los movimientos fijos del mes que aún no estén registrados. */
export async function applyRecurring(fd: FormData) {
  await requireAuth();
  const ym = str(fd, "month");
  if (!/^\d{4}-\d{2}$/.test(ym)) return;
  const { start, end, days } = monthRange(ym);
  const items = await db.select().from(recurring).where(eq(recurring.active, true));
  if (!items.length) return;
  const existing = await db
    .select({ rid: transactions.recurringId })
    .from(transactions)
    .where(and(gte(transactions.date, start), lte(transactions.date, end), inArray(transactions.recurringId, items.map((i) => i.id))));
  const done = new Set(existing.map((e) => e.rid));
  const rows = items
    .filter((i) => !done.has(i.id))
    .map((i) => ({
      date: `${ym}-${String(Math.min(i.dayOfMonth, days)).padStart(2, "0")}`,
      description: i.name,
      amount: i.amount,
      type: i.type,
      kind: "fijo",
      category: i.category,
      account: i.account,
      recurringId: i.id,
    }));
  if (rows.length) await db.insert(transactions).values(rows);
  refresh();
}

/* ───────────── Deudas ───────────── */

function debtFields(fd: FormData) {
  return {
    name: str(fd, "name"),
    lender: str(fd, "lender"),
    total: optMoney(fd, "total"),
    interestRate: optMoney(fd, "interestRate"),
    minPayment: optMoney(fd, "minPayment"),
    dueDay: optInt(fd, "dueDay"),
    notes: str(fd, "notes"),
  };
}

export async function createDebt(fd: FormData) {
  await requireAuth();
  const { total, ...rest } = debtFields(fd);
  if (!rest.name || !total) return;
  await db.insert(debts).values({ ...rest, total });
  refresh();
}

export async function updateDebt(fd: FormData) {
  await requireAuth();
  const { total, ...rest } = debtFields(fd);
  if (!rest.name || !total) return;
  await db.update(debts).set({ ...rest, total, closed: fd.get("closed") !== null }).where(eq(debts.id, id(fd)));
  refresh();
}

export async function deleteDebt(fd: FormData) {
  await requireAuth();
  await db.delete(debts).where(eq(debts.id, id(fd)));
  refresh();
}

export async function addDebtPayment(fd: FormData) {
  await requireAuth();
  const debtId = Number(fd.get("debtId"));
  const amount = optMoney(fd, "amount");
  if (!debtId || !amount) return;
  const date = optDate(fd, "date") ?? todayISO();
  const [debt] = await db.select().from(debts).where(eq(debts.id, debtId));
  if (!debt) return;
  let transactionId: number | null = null;
  if (fd.get("asExpense") !== null) {
    const [tx] = await db
      .insert(transactions)
      .values({ date, description: `Pago: ${debt.name}`, amount: Math.abs(Number(amount)).toFixed(2), type: "gasto", kind: "fijo", category: "Deudas" })
      .returning({ id: transactions.id });
    transactionId = tx.id;
  }
  await db.insert(debtPayments).values({ debtId, date, amount: Math.abs(Number(amount)).toFixed(2), note: str(fd, "note"), transactionId });
  const [{ paid }] = await db
    .select({ paid: sql<string>`coalesce(sum(${debtPayments.amount}),0)` })
    .from(debtPayments)
    .where(eq(debtPayments.debtId, debtId));
  if (Number(paid) >= Number(debt.total)) await db.update(debts).set({ closed: true }).where(eq(debts.id, debtId));
  refresh();
}

export async function deleteDebtPayment(fd: FormData) {
  await requireAuth();
  const [p] = await db.delete(debtPayments).where(eq(debtPayments.id, id(fd))).returning();
  if (p?.transactionId) await db.delete(transactions).where(eq(transactions.id, p.transactionId));
  refresh();
}

/* ───────────── Importar estados de cuenta ───────────── */

export type ImportRow = { date: string; description: string; amount: number; type: "ingreso" | "gasto"; category: string; kind: string };

async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function importStatement(input: {
  account: string;
  periodStart: string | null;
  periodEnd: string | null;
  fileName: string;
  rows: ImportRow[];
}): Promise<{ inserted: number; duplicates: number }> {
  await requireAuth();
  const account = input.account.trim() || "Tarjeta";
  const valid = input.rows.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.amount > 0 && Number.isFinite(r.amount));
  if (!valid.length) return { inserted: 0, duplicates: 0 };

  // Huella por movimiento: misma cuenta + fecha + importe + descripción (+ nº de repetición ese día).
  const seen = new Map<string, number>();
  const withHash = await Promise.all(
    valid.map(async (r) => {
      const base = `${account.toLowerCase()}|${r.date}|${r.amount.toFixed(2)}|${r.type}|${r.description.toLowerCase().replace(/\s+/g, " ").trim()}`;
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      return { ...r, hash: await sha(`${base}|${n}`) };
    }),
  );
  const existing = await db
    .select({ hash: transactions.hash })
    .from(transactions)
    .where(inArray(transactions.hash, withHash.map((r) => r.hash)));
  const dup = new Set(existing.map((e) => e.hash));
  const fresh = withHash.filter((r) => !dup.has(r.hash));

  if (fresh.length) {
    const [st] = await db
      .insert(statements)
      .values({ account, periodStart: input.periodStart || null, periodEnd: input.periodEnd || null, fileName: input.fileName.slice(0, 200), count: fresh.length })
      .returning({ id: statements.id });
    for (let i = 0; i < fresh.length; i += 200) {
      await db.insert(transactions).values(
        fresh.slice(i, i + 200).map((r) => ({
          date: r.date,
          description: r.description.slice(0, 300),
          amount: r.amount.toFixed(2),
          type: r.type,
          kind: ["fijo", "variable", "extra"].includes(r.kind) ? r.kind : "variable",
          category: r.category || "Otros",
          account,
          statementId: st.id,
          hash: r.hash,
        })),
      );
    }
  }
  refresh();
  return { inserted: fresh.length, duplicates: withHash.length - fresh.length };
}

export async function deleteStatement(fd: FormData) {
  await requireAuth();
  await db.delete(statements).where(eq(statements.id, id(fd)));
  refresh();
}
