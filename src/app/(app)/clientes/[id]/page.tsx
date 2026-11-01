import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { clientNotes, clients } from "@/db/schema";
import { ClaudeButton } from "@/components/claude-button";
import { AutoSubmit, ConfirmButton, ResetOnSubmitForm, SubmitButton } from "@/components/client";
import { ClientFields } from "@/components/client-fields";
import { Badge, PageHeader, Section, Select } from "@/components/ui";
import { claudeUrl } from "@/lib/claude";
import { CLIENT_STAGE, opt } from "@/lib/constants";
import { fmtDate, relDay, todayISO } from "@/lib/dates";
import { money } from "@/lib/format";
import { telUrl, whatsappUrl } from "@/lib/phone";
import { addClientNote, deleteClient, deleteClientNote, setClientStage, updateClient } from "../actions";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const cid = Number((await params).id);
  if (!Number.isInteger(cid)) notFound();
  const [c] = await db.select().from(clients).where(eq(clients.id, cid));
  if (!c) notFound();
  const notes = await db.select().from(clientNotes).where(eq(clientNotes.clientId, cid)).orderBy(desc(clientNotes.date), desc(clientNotes.id));
  const s = opt(CLIENT_STAGE, c.stage);
  const wa = c.phone ? whatsappUrl(c.phone) : null;
  const tel = c.phone ? telUrl(c.phone) : null;

  const prompt = [
    "Vendo menús digitales y sistemas para restaurantes. Ayúdame con el siguiente paso con este prospecto (mensaje de seguimiento por WhatsApp, propuesta, manejo de objeciones o cierre).",
    "",
    `Contacto: ${c.name}${c.business ? ` — ${c.business}` : ""}${c.city ? ` (${c.city})` : ""}`,
    c.product && `Producto que le interesa: ${c.product}`,
    c.value && `Valor estimado: ${money(c.value)}`,
    `Etapa: ${s.label}`,
    c.notes && `Notas: ${c.notes}`,
    notes.length ? "\nHistorial:" : "",
    ...notes.slice(0, 15).reverse().map((n) => `- ${fmtDate(n.date, true)}: ${n.note}`),
  ]
    .filter((l): l is string => typeof l === "string")
    .join("\n");

  return (
    <>
      <PageHeader
        back={{ href: "/clientes", label: "Clientes" }}
        title={c.business || c.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {c.business && <span>{c.name}</span>}
            <Badge tone={s.tone}>{s.label}</Badge>
            {c.value && <span>{money(c.value)}</span>}
            {c.nextFollowUp && <span>Seguimiento: {fmtDate(c.nextFollowUp)} ({relDay(c.nextFollowUp)})</span>}
          </span>
        }
      />

      <div className="card mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn bg-emerald-600 text-white hover:bg-emerald-500">
              WhatsApp
            </a>
          )}
          {tel && (
            <a href={tel} className="btn-secondary">
              📞 Llamar
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} className="btn-secondary">
              ✉ Correo
            </a>
          )}
        </div>
        <div className="muted flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {c.phone && <span>{c.phone}</span>}
          {c.email && <span>{c.email}</span>}
          {c.product && <span>{c.product}</span>}
          {c.source && <span>Llegó por: {c.source}</span>}
        </div>
        {c.notes && <p className="whitespace-pre-wrap text-sm">{c.notes}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ClaudeButton url={claudeUrl(prompt)} prompt={prompt} label="Siguiente paso con Claude" />
          <form action={setClientStage} className="flex items-center gap-2">
            <input type="hidden" name="id" value={c.id} />
            <AutoSubmit>
              <Select name="stage" options={CLIENT_STAGE} defaultValue={c.stage} className="input w-auto" />
            </AutoSubmit>
          </form>
        </div>
      </div>

      <Section title="¿En qué me quedé?">
        <ResetOnSubmitForm action={addClientNote} className="card mb-3 grid gap-2 sm:grid-cols-6">
          <input type="hidden" name="clientId" value={c.id} />
          <label className="sm:col-span-4">
            <span className="label">Nota</span>
            <input name="note" className="input" required placeholder="Le mandé demo, quedó de responder el lunes…" />
          </label>
          <label className="sm:col-span-2">
            <span className="label">Fecha</span>
            <input name="date" type="date" className="input" defaultValue={todayISO()} />
          </label>
          <label className="sm:col-span-3">
            <span className="label">Próximo seguimiento (opcional)</span>
            <input name="nextFollowUp" type="date" className="input" />
          </label>
          <div className="flex items-end sm:col-span-3">
            <SubmitButton>Agregar</SubmitButton>
          </div>
        </ResetOnSubmitForm>
        {notes.length > 0 && (
          <ol className="card space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="flex items-start gap-3 text-sm">
                <span className="muted w-16 shrink-0 text-xs leading-5">{fmtDate(n.date)}</span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{n.note}</span>
                <form action={deleteClientNote}>
                  <input type="hidden" name="id" value={n.id} />
                  <input type="hidden" name="clientId" value={c.id} />
                  <ConfirmButton message="¿Borrar?" className="btn-danger px-2 py-0.5 text-xs">
                    ✕
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Editar">
        <form action={updateClient} className="card space-y-3">
          <input type="hidden" name="id" value={c.id} />
          <ClientFields c={c} />
          <SubmitButton>Guardar cambios</SubmitButton>
        </form>
        <form action={deleteClient} className="mt-3">
          <input type="hidden" name="id" value={c.id} />
          <ConfirmButton message="¿Borrar este contacto y su historial?">Borrar contacto</ConfirmButton>
        </form>
      </Section>
    </>
  );
}
