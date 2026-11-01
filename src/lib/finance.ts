import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { debtPayments, debts, recurring, transactions } from "@/db/schema";
import { monthRange, shiftMonth } from "./dates";

export async function monthSummary(ym: string) {
  const { start, end } = monthRange(ym);
  const rows = await db
    .select({ type: transactions.type, kind: transactions.kind, total: sql<string>`sum(${transactions.amount})`, n: sql<number>`count(*)` })
    .from(transactions)
    .where(and(gte(transactions.date, start), lte(transactions.date, end)))
    .groupBy(transactions.type, transactions.kind);
  const pick = (type: string, kind?: string) =>
    rows.filter((r) => r.type === type && (!kind || r.kind === kind)).reduce((a, r) => a + Number(r.total), 0);
  const income = pick("ingreso");
  const expense = pick("gasto");
  return {
    income,
    expense,
    net: income - expense,
    savingsRate: income > 0 ? (income - expense) / income : null,
    count: rows.reduce((a, r) => a + Number(r.n), 0),
    incomeFixed: pick("ingreso", "fijo"),
    incomeExtra: pick("ingreso", "extra"),
    incomeVariable: pick("ingreso", "variable"),
    expenseFixed: pick("gasto", "fijo"),
    expenseVariable: pick("gasto", "variable"),
    expenseExtra: pick("gasto", "extra"),
  };
}

export async function byCategory(ym: string, type: "ingreso" | "gasto") {
  const { start, end } = monthRange(ym);
  const rows = await db
    .select({ category: transactions.category, total: sql<string>`sum(${transactions.amount})`, n: sql<number>`count(*)` })
    .from(transactions)
    .where(and(eq(transactions.type, type), gte(transactions.date, start), lte(transactions.date, end)))
    .groupBy(transactions.category)
    .orderBy(desc(sql`sum(${transactions.amount})`));
  return rows.map((r) => ({ category: r.category, total: Number(r.total), n: Number(r.n) }));
}

export async function trend(ym: string, months = 12) {
  const first = shiftMonth(ym, -(months - 1));
  const rows = await db
    .select({ m: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`, type: transactions.type, total: sql<string>`sum(${transactions.amount})` })
    .from(transactions)
    .where(and(gte(transactions.date, `${first}-01`), lte(transactions.date, monthRange(ym).end)))
    .groupBy(sql`1`, transactions.type);
  return Array.from({ length: months }, (_, i) => {
    const m = shiftMonth(first, i);
    const get = (t: string) => Number(rows.find((r) => r.m === m && r.type === t)?.total ?? 0);
    return { month: m, income: get("ingreso"), expense: get("gasto") };
  });
}

export async function allTimeTotals() {
  const [r] = await db
    .select({
      income: sql<string>`coalesce(sum(case when ${transactions.type}='ingreso' then ${transactions.amount} end),0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type}='gasto' then ${transactions.amount} end),0)`,
    })
    .from(transactions);
  return { income: Number(r.income), expense: Number(r.expense), net: Number(r.income) - Number(r.expense) };
}

export async function debtsWithBalance() {
  const list = await db.select().from(debts).orderBy(debts.closed, debts.createdAt);
  const paid = await db
    .select({ debtId: debtPayments.debtId, paid: sql<string>`sum(${debtPayments.amount})` })
    .from(debtPayments)
    .groupBy(debtPayments.debtId);
  return list.map((d) => {
    const p = Number(paid.find((x) => x.debtId === d.id)?.paid ?? 0);
    return { ...d, paid: p, balance: Math.max(0, Number(d.total) - p) };
  });
}

export async function pendingRecurring(ym: string) {
  const { start, end } = monthRange(ym);
  const items = await db.select().from(recurring).where(eq(recurring.active, true));
  const done = await db
    .select({ rid: transactions.recurringId })
    .from(transactions)
    .where(and(gte(transactions.date, start), lte(transactions.date, end), sql`${transactions.recurringId} is not null`));
  const set = new Set(done.map((d) => d.rid));
  return items.filter((i) => !set.has(i.id));
}

export async function distinctAccounts() {
  const rows = await db.selectDistinct({ a: transactions.account }).from(transactions).where(sql`${transactions.account} <> ''`);
  return rows.map((r) => r.a).sort();
}
