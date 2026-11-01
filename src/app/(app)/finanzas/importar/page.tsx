import type { Metadata } from "next";
import Link from "next/link";
import { desc, ne } from "drizzle-orm";
import { db } from "@/db";
import { statements, transactions } from "@/db/schema";
import { ConfirmButton } from "@/components/client";
import { Section } from "@/components/ui";
import { fmtDate, monthKey, shiftMonth, todayISO } from "@/lib/dates";
import { distinctAccounts } from "@/lib/finance";
import { deleteStatement } from "../actions";
import { learnKey } from "@/lib/categorize";
import { Importer } from "./importer";

export const metadata: Metadata = { title: "Importar estado de cuenta" };

export default async function ImportPage() {
  const today = todayISO();
  // Periodo por defecto: del 23 del mes pasado al 23 de este mes (o del anterior si aún no llega el corte).
  const endMonth = Number(today.slice(8)) >= 23 ? monthKey(today) : shiftMonth(monthKey(today), -1);
  const defaultEnd = `${endMonth}-23`;
  const defaultStart = `${shiftMonth(endMonth, -1)}-24`;

  const [accounts, history, recent] = await Promise.all([
    distinctAccounts(),
    db.select().from(statements).orderBy(desc(statements.createdAt)).limit(50),
    db
      .select({ description: transactions.description, category: transactions.category })
      .from(transactions)
      .where(ne(transactions.category, "Otros"))
      .orderBy(desc(transactions.id))
      .limit(2000),
  ]);
  const learned: Record<string, string> = {};
  for (const r of recent.reverse()) {
    const k = learnKey(r.description);
    if (k) learned[k] = r.category;
  }

  return (
    <>
      <p className="muted mb-4 text-sm">
        Sube el PDF de tu estado de cuenta (o un CSV de tu banca en línea). Reviso cada movimiento, le sugiero categoría y tú decides qué importar. Si
        subes el mismo estado dos veces, no se duplican. Las categorías que corrijas se recuerdan para la próxima vez.
      </p>
      <Importer accounts={accounts} defaultStart={defaultStart} defaultEnd={defaultEnd} learned={learned} />

      {history.length > 0 && (
        <Section title="Estados importados">
          <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800/60">
            {history.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{s.account}</span>
                  <span className="muted">
                    {" "}
                    · {s.periodStart ? `${fmtDate(s.periodStart, true)} → ${fmtDate(s.periodEnd, true)}` : "sin periodo"} · {s.count} movimientos
                  </span>
                  <span className="muted block truncate text-xs">{s.fileName}</span>
                </span>
                {s.periodEnd && (
                  <Link href={`/finanzas/movimientos?mes=${monthKey(s.periodEnd)}&cuenta=${encodeURIComponent(s.account)}`} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                    Ver
                  </Link>
                )}
                <form action={deleteStatement}>
                  <input type="hidden" name="id" value={s.id} />
                  <ConfirmButton message={`¿Deshacer esta importación? Se borrarán sus ${s.count} movimientos.`} className="btn-danger px-2 py-1 text-xs">
                    Deshacer
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
