import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { jobEvents, jobs } from "@/db/schema";
import { ClaudeButton } from "@/components/claude-button";
import { AutoSubmit, ConfirmButton, ResetOnSubmitForm, SubmitButton } from "@/components/client";
import { JobFields } from "@/components/job-fields";
import { Badge, PageHeader, Section, Select } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { aboutMe, claudeUrl } from "@/lib/claude";
import { JOB_STATUS, opt } from "@/lib/constants";
import { fmtDate, relDay, todayISO } from "@/lib/dates";
import { addJobEvent, deleteJob, deleteJobEvent, setJobStatus, updateJob } from "../actions";

export const metadata: Metadata = { title: "Vacante" };

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const jid = Number((await params).id);
  if (!Number.isInteger(jid)) notFound();
  const [j] = await db.select().from(jobs).where(and(eq(jobs.id, jid), eq(jobs.userId, user.id)));
  if (!j) notFound();
  const events = await db.select().from(jobEvents).where(and(eq(jobEvents.jobId, jid), eq(jobEvents.userId, user.id))).orderBy(desc(jobEvents.date), desc(jobEvents.id));
  const s = opt(JOB_STATUS, j.status);

  const prompt = [
    "Ayúdame con esta vacante (redactar correo, adaptar mi CV, preparar entrevista o dar seguimiento, según lo que toque).",
    "",
    `Empresa: ${j.company}`,
    j.position && `Puesto: ${j.position}`,
    j.url && `Vacante: ${j.url}`,
    j.salary && `Sueldo: ${j.salary}`,
    j.modality && `Modalidad: ${j.modality}`,
    j.contactName && `Contacto: ${j.contactName} ${j.contactEmail}`,
    `Estado: ${s.label}${j.appliedAt ? ` (apliqué el ${fmtDate(j.appliedAt, true)})` : ""}`,
    j.notes && `Notas: ${j.notes}`,
    events.length ? "\nHistorial:" : "",
    ...events.slice(0, 15).reverse().map((e) => `- ${fmtDate(e.date, true)}: ${e.note}`),
    "",
    aboutMe(user),
  ]
    .filter((l): l is string => typeof l === "string")
    .join("\n");

  return (
    <>
      <PageHeader
        back={{ href: "/trabajos", label: "Trabajos" }}
        title={j.company}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {j.position && <span>{j.position}</span>}
            <Badge tone={s.tone}>{s.label}</Badge>
            {j.nextFollowUp && <span>Seguimiento: {fmtDate(j.nextFollowUp)} ({relDay(j.nextFollowUp)})</span>}
          </span>
        }
      />

      <div className="card mb-6 space-y-3">
        <div className="muted flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {j.source && <span>Fuente: {j.source}</span>}
          {j.salary && <span>💵 {j.salary}</span>}
          {j.modality && <span>📍 {j.modality}</span>}
          {j.contactEmail && (
            <a className="text-indigo-600 hover:underline dark:text-indigo-400" href={`mailto:${j.contactEmail}`}>
              ✉ {j.contactName || j.contactEmail}
            </a>
          )}
          {j.url && (
            <a href={j.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">
              Ver vacante ↗
            </a>
          )}
        </div>
        {j.notes && <p className="whitespace-pre-wrap text-sm">{j.notes}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ClaudeButton url={claudeUrl(prompt)} prompt={prompt} label="Preparar con Claude" />
          <form action={setJobStatus} className="flex items-center gap-2">
            <input type="hidden" name="id" value={j.id} />
            <AutoSubmit>
              <Select name="status" options={JOB_STATUS} defaultValue={j.status} className="input w-auto" />
            </AutoSubmit>
          </form>
        </div>
      </div>

      <Section title="Historial">
        <ResetOnSubmitForm action={addJobEvent} className="card mb-3 grid gap-2 sm:grid-cols-6">
          <input type="hidden" name="jobId" value={j.id} />
          <label className="sm:col-span-4">
            <span className="label">¿Qué pasó?</span>
            <input name="note" className="input" required placeholder="Mandé correo, me respondieron, entrevista…" />
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
        {events.length > 0 && (
          <ol className="card space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-3 text-sm">
                <span className="muted w-16 shrink-0 text-xs leading-5">{fmtDate(e.date)}</span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{e.note}</span>
                <form action={deleteJobEvent}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="jobId" value={j.id} />
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
        <form action={updateJob} className="card space-y-3">
          <input type="hidden" name="id" value={j.id} />
          <JobFields j={j} />
          <SubmitButton>Guardar cambios</SubmitButton>
        </form>
        <form action={deleteJob} className="mt-3">
          <input type="hidden" name="id" value={j.id} />
          <ConfirmButton message="¿Borrar esta vacante?">Borrar vacante</ConfirmButton>
        </form>
      </Section>
    </>
  );
}
