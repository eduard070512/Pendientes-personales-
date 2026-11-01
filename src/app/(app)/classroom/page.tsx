import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classroomItems } from "@/db/schema";
import { ClaudeButton } from "@/components/claude-button";
import { ConfirmButton, SubmitButton } from "@/components/client";
import { Badge, Empty, PageHeader, Tabs } from "@/components/ui";
import { requireUid } from "@/lib/auth";
import { claudeUrl } from "@/lib/claude";
import { daysUntil, fmtDate, fmtDateTime, relDay, todayISO } from "@/lib/dates";
import { googleAccount, googleConfigured, redirectUri } from "@/lib/google";
import { getSetting } from "@/lib/settings";
import { disconnect, toTask, toggleHidden } from "./actions";
import { SyncButton } from "./sync-button";

export const metadata: Metadata = { title: "Classroom" };

type Item = typeof classroomItems.$inferSelect;

function stateBadge(it: Item, today: string) {
  if (it.state === "devuelta") return <Badge tone="green">{it.grade != null ? `Calificada ${Number(it.grade)}${it.maxPoints ? `/${Number(it.maxPoints)}` : ""}` : "Devuelta"}</Badge>;
  if (it.state === "entregada") return <Badge tone="blue">Entregada{it.late ? " (tarde)" : ""}</Badge>;
  if (it.dueDate && it.dueDate < today) return <Badge tone="red">Atrasada</Badge>;
  return <Badge tone="amber">Por entregar</Badge>;
}

export default async function ClassroomPage({ searchParams }: { searchParams: Promise<{ ver?: string; clase?: string; error?: string; conectado?: string }> }) {
  const uid = await requireUid();
  const sp = await searchParams;
  const ver = sp.ver ?? "pendientes";
  const today = todayISO();
  const [all, account, lastSync, lastEmail] = await Promise.all([
    db.select().from(classroomItems).where(eq(classroomItems.userId, uid)).orderBy(sql`${classroomItems.dueDate} asc nulls last`, asc(classroomItems.title)),
    googleAccount(uid),
    getSetting(uid, "classroom.last_sync"),
    getSetting(uid, "classroom.last_email"),
  ]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const visible = all.filter((i) => !i.hidden);
  const pending = visible.filter((i) => i.state === "pendiente");
  const done = visible.filter((i) => i.state !== "pendiente");
  const base = ver === "pendientes" ? pending : ver === "entregadas" ? done.sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? "")) : ver === "ocultas" ? all.filter((i) => i.hidden) : visible;
  const list = sp.clase ? base.filter((i) => i.courseName === sp.clase) : base;
  const courses = [...new Set(visible.map((i) => i.courseName).filter(Boolean))].sort();
  const overdue = pending.filter((i) => i.dueDate && i.dueDate < today).length;
  const q = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const m = { ver, clase: sp.clase, ...patch };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    return `/classroom?${p}`;
  };

  return (
    <>
      <PageHeader
        title="Classroom"
        subtitle={
          all.length
            ? `${pending.length} por entregar${overdue ? ` · ${overdue} atrasadas` : ""} · ${done.length} entregadas`
            : "Tus tareas de Google Classroom"
        }
        actions={account ? <SyncButton /> : undefined}
      />

      {sp.error && (
        <div className="card mb-4 border-red-300 text-sm text-red-700 dark:border-red-800 dark:text-red-300">
          {sp.error === "config"
            ? "Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en las variables de entorno."
            : sp.error === "state"
              ? "La conexión expiró. Vuelve a intentarlo."
              : sp.error === "access_denied"
                ? "Cancelaste el permiso en Google."
                : `Error: ${sp.error}`}
        </div>
      )}
      {sp.conectado && !sp.error && <div className="card mb-4 border-emerald-300 text-sm text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">¡Cuenta conectada y tareas sincronizadas!</div>}

      {all.length === 0 && !account ? (
        <Empty>Conecta tu cuenta de la escuela (abajo) o configura n8n para traer tus tareas.</Empty>
      ) : (
        <>
          <Tabs
            active={ver}
            items={[
              { key: "pendientes", label: `Por entregar (${pending.length})`, href: q({ ver: "pendientes" }) },
              { key: "entregadas", label: `Entregadas (${done.length})`, href: q({ ver: "entregadas" }) },
              { key: "todas", label: "Todas", href: q({ ver: "todas" }) },
              { key: "ocultas", label: "Ocultas", href: q({ ver: "ocultas" }) },
            ]}
          />
          {courses.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
              <Link href={q({ clase: undefined })} className={`rounded-full px-2.5 py-1 ${!sp.clase ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                Todas las clases
              </Link>
              {courses.map((c) => (
                <Link key={c} href={q({ clase: c })} className={`rounded-full px-2.5 py-1 ${sp.clase === c ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                  {c}
                </Link>
              ))}
            </div>
          )}

          {list.length === 0 ? (
            <Empty>{ver === "pendientes" ? "¡No tienes tareas por entregar! 🎉" : "Nada aquí."}</Empty>
          ) : (
            <ul className="card mb-8 divide-y divide-zinc-100 p-0 dark:divide-zinc-800/60">
              {list.map((it) => {
                const prompt = [
                  "Ayúdame con esta tarea de la universidad: entender qué piden, planear cómo hacerla y empezarla juntos.",
                  "",
                  `Clase: ${it.courseName}`,
                  `Tarea: ${it.title}`,
                  it.dueDate ? `Entrega: ${fmtDate(it.dueDate, true)}${it.dueTime ? ` a las ${it.dueTime}` : ""} (${relDay(it.dueDate)})` : "",
                  it.maxPoints ? `Vale ${Number(it.maxPoints)} puntos` : "",
                  it.description ? `\nInstrucciones del profesor:\n${it.description}` : "",
                  it.link ? `\nEnlace: ${it.link}` : "",
                ]
                  .filter((l) => l !== "")
                  .join("\n");
                const urgent = it.state === "pendiente" && it.dueDate && daysUntil(it.dueDate) <= 1;
                return (
                  <li key={it.id}>
                    <details>
                      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <span className="mt-0.5 text-lg" aria-hidden>
                          📚
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{it.title}</span>
                          <span className="muted flex flex-wrap gap-x-2 text-xs">
                            <span>{it.courseName || "Clase"}</span>
                            {it.dueDate && (
                              <span className={urgent ? "font-medium text-red-600 dark:text-red-400" : ""}>
                                · Entrega {fmtDate(it.dueDate)}
                                {it.dueTime ? ` ${it.dueTime}` : ""} ({relDay(it.dueDate)})
                              </span>
                            )}
                            {it.taskId && <span>· en pendientes</span>}
                          </span>
                        </span>
                        {stateBadge(it, today)}
                      </summary>
                      <div className="space-y-3 border-t border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                        {it.description && <p className="whitespace-pre-wrap text-sm">{it.description}</p>}
                        <div className="flex flex-wrap gap-2">
                          {it.link && (
                            <a href={it.link} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                              Abrir en Classroom ↗
                            </a>
                          )}
                          <form action={toTask}>
                            <input type="hidden" name="id" value={it.id} />
                            <SubmitButton className="btn-secondary" pendingText="Creando…">
                              {it.taskId ? "Ver pendiente" : "＋ Pasar a pendientes"}
                            </SubmitButton>
                          </form>
                          <form action={toggleHidden}>
                            <input type="hidden" name="id" value={it.id} />
                            <SubmitButton className="btn-secondary">{it.hidden ? "Mostrar" : "Ocultar"}</SubmitButton>
                          </form>
                        </div>
                        <ClaudeButton url={claudeUrl(prompt)} prompt={prompt} label="Hacerla con Claude" />
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <details className="card" open={!account && all.length === 0}>
        <summary className="cursor-pointer text-sm font-medium">⚙️ Conexión con Classroom</summary>
        <div className="mt-4 space-y-6 text-sm">
          <section className="space-y-2">
            <h3 className="font-semibold">Opción 1 · API de Classroom (recomendada)</h3>
            <p className="muted">Trae todas tus tareas con fecha de entrega, si ya la entregaste y tu calificación.</p>
            {account ? (
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="green">Conectado: {account.email}</Badge>
                {lastSync && <span className="muted text-xs">Última sincronización: {fmtDateTime(new Date(lastSync))}</span>}
                <form action={disconnect}>
                  <ConfirmButton message="¿Desconectar tu cuenta de Google? Las tareas ya guardadas se quedan.">Desconectar</ConfirmButton>
                </form>
              </div>
            ) : googleConfigured() ? (
              <a href="/api/google/connect" className="btn-primary">
                Conectar mi cuenta de la escuela
              </a>
            ) : (
              <p className="text-amber-700 dark:text-amber-300">
                Falta configurar <code>GOOGLE_CLIENT_ID</code> y <code>GOOGLE_CLIENT_SECRET</code> (ver README). URI de redirección para Google Cloud:{" "}
                <code className="break-all">{redirectUri(origin)}</code>
              </p>
            )}
            <p className="muted text-xs">
              Se sincroniza con el botón, una vez al día con el cron de Vercel y cada vez que lo llame n8n:{" "}
              <code className="break-all">GET {origin}/api/cron/classroom</code> con tu <Link href="/cuenta" className="text-indigo-600 hover:underline dark:text-indigo-400">token personal</Link> (<code>Authorization: Bearer pp_…</code>).
            </p>
          </section>
          <section className="space-y-2">
            <h3 className="font-semibold">Opción 2 · Correos de Classroom con n8n (respaldo)</h3>
            <p className="muted">
              Si tu escuela bloquea la API, n8n lee los correos de <code>no-reply@classroom.google.com</code> y los manda aquí. Importa{" "}
              <a href="/n8n/classroom-gmail.json" download className="text-indigo-600 hover:underline dark:text-indigo-400">
                este workflow
              </a>{" "}
              en n8n.
            </p>
            <p className="muted text-xs">
              Webhook: <code className="break-all">POST {origin}/api/ingest/classroom-email</code> con tu{" "}
              <Link href="/cuenta" className="text-indigo-600 hover:underline dark:text-indigo-400">token personal</Link> (<code>Authorization: Bearer pp_…</code>)
              {lastEmail && <> · Último correo recibido: {fmtDateTime(new Date(lastEmail))}</>}
            </p>
          </section>
        </div>
      </details>
    </>
  );
}
