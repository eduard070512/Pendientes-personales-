import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, ilike, or, sql, and } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { SubmitButton } from "@/components/client";
import { ClientFields } from "@/components/client-fields";
import { Badge, Empty, PageHeader, Tabs } from "@/components/ui";
import { CLIENT_STAGE, opt } from "@/lib/constants";
import { daysUntil, fmtDate, relDay } from "@/lib/dates";
import { money } from "@/lib/format";
import { whatsappUrl } from "@/lib/phone";
import { createClient } from "./actions";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ etapa?: string; q?: string }> }) {
  const { etapa = "todos", q = "" } = await searchParams;
  const counts = await db
    .select({ stage: clients.stage, n: sql<number>`count(*)`, v: sql<string>`coalesce(sum(${clients.value}),0)` })
    .from(clients)
    .groupBy(clients.stage);
  const total = counts.reduce((a, c) => a + Number(c.n), 0);
  const pipeline = counts.filter((c) => !["cliente", "perdido"].includes(c.stage)).reduce((a, c) => a + Number(c.v), 0);
  const won = counts.find((c) => c.stage === "cliente");

  const search = q.trim() ? `%${q.trim()}%` : null;
  const list = await db
    .select()
    .from(clients)
    .where(
      and(
        etapa === "todos" ? undefined : eq(clients.stage, etapa),
        search ? or(ilike(clients.name, search), ilike(clients.business, search), ilike(clients.phone, search), ilike(clients.city, search)) : undefined,
      ),
    )
    .orderBy(sql`${clients.nextFollowUp} asc nulls last`, desc(clients.updatedAt));

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${total} contactos · En proceso ${money(pipeline)} · Cerrados ${won ? `${won.n} (${money(won.v)})` : "0"}`}
      />

      <details className="card mb-5" open={total === 0}>
        <summary className="cursor-pointer text-sm font-medium">＋ Nuevo prospecto</summary>
        <form action={createClient} className="mt-3 space-y-3">
          <ClientFields />
          <SubmitButton>Agregar</SubmitButton>
        </form>
      </details>

      <form className="mb-3">
        {etapa !== "todos" && <input type="hidden" name="etapa" value={etapa} />}
        <input name="q" defaultValue={q} className="input" placeholder="Buscar por nombre, negocio, teléfono o ciudad…" />
      </form>

      <Tabs
        active={etapa}
        items={[
          { key: "todos", label: `Todos (${total})`, href: `/clientes${q ? `?q=${encodeURIComponent(q)}` : ""}` },
          ...CLIENT_STAGE.map((s) => ({
            key: s.value,
            label: `${s.label} (${counts.find((c) => c.stage === s.value)?.n ?? 0})`,
            href: `/clientes?etapa=${s.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
          })),
        ]}
      />

      {list.length === 0 ? (
        <Empty>No hay contactos aquí.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((c) => {
            const s = opt(CLIENT_STAGE, c.stage);
            const wa = c.phone ? whatsappUrl(c.phone) : null;
            return (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/clientes/${c.id}`} className="min-w-0 hover:underline">
                    <div className="truncate font-semibold">{c.business || c.name}</div>
                    <div className="muted truncate text-sm">
                      {c.business ? c.name : ""}
                      {c.city ? `${c.business ? " · " : ""}${c.city}` : ""}
                    </div>
                  </Link>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
                <div className="muted mt-2 flex flex-wrap gap-x-3 text-xs">
                  {c.product && <span>{c.product}</span>}
                  {c.value && <span>{money(c.value)}</span>}
                  {c.nextFollowUp && (
                    <span className={daysUntil(c.nextFollowUp) <= 0 ? "font-medium text-red-600 dark:text-red-400" : ""}>
                      Seguimiento {fmtDate(c.nextFollowUp)} ({relDay(c.nextFollowUp)})
                    </span>
                  )}
                </div>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400">
                    WhatsApp ↗
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
