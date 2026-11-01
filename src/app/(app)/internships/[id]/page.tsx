import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { internshipSteps, internships } from "@/db/schema";
import { ClaudeButton } from "@/components/claude-button";
import { AutoSubmit, ConfirmButton, ResetOnSubmitForm, SubmitButton } from "@/components/client";
import { InternshipFields } from "@/components/internship-fields";
import { Badge, PageHeader, Section, Select } from "@/components/ui";
import { claudeUrl } from "@/lib/claude";
import { INTERNSHIP_STATUS, opt } from "@/lib/constants";
import { daysUntil, fmtDate, relDay } from "@/lib/dates";
import { addStep, deleteInternship, deleteStep, setInternshipStatus, toggleStep, updateInternship, updateStep } from "../actions";

export const metadata: Metadata = { title: "Internship" };

export default async function InternshipPage({ params }: { params: Promise<{ id: string }> }) {
  const iid = Number((await params).id);
  if (!Number.isInteger(iid)) notFound();
  const [i] = await db.select().from(internships).where(eq(internships.id, iid));
  if (!i) notFound();
  const steps = await db.select().from(internshipSteps).where(eq(internshipSteps.internshipId, iid)).orderBy(asc(internshipSteps.position), asc(internshipSteps.id));
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  const prompt = ([
    `Estoy aplicando a este internship y quiero que me ayudes con el siguiente paso.`,
    "",
    `Empresa: ${i.company}`,
    i.program && `Programa: ${i.program}`,
    i.url && `Enlace: ${i.url}`,
    i.location && `Ubicación: ${i.location} (${i.modality})`,
    i.deadline && `Fecha límite: ${fmtDate(i.deadline, true)} (${relDay(i.deadline)})`,
    `Estado: ${opt(INTERNSHIP_STATUS, i.status).label}`,
    i.notes && `Notas: ${i.notes}`,
    "",
    "Pasos:",
    ...steps.map((s) => `- [${s.done ? "x" : " "}] ${s.title}${s.dueDate ? ` (para ${fmtDate(s.dueDate)})` : ""}`),
    "",
    next ? `Ayúdame a completar ahora: "${next.title}".` : "Ayúdame a preparar lo que sigue (entrevistas, seguimiento).",
    "Soy Eduardo Michel, 19 años, estudiante de 2.º año de Ingeniería en Computación Inteligente (U. de Colima), backend y automatización (Next.js, TypeScript, PostgreSQL, n8n, agentes LLM), inglés B2. Mi GitHub: https://github.com/eduard070512",
  ] as (string | null | false)[])
    .filter((l): l is string => typeof l === "string")
    .join("\n");

  const status = opt(INTERNSHIP_STATUS, i.status);
  return (
    <>
      <PageHeader
        back={{ href: "/internships", label: "Internships" }}
        title={i.company}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {i.program && <span>{i.program}</span>}
            <Badge tone={status.tone}>{status.label}</Badge>
            {i.deadline && (
              <span className={daysUntil(i.deadline) <= 7 ? "font-medium text-red-600 dark:text-red-400" : ""}>
                Límite {fmtDate(i.deadline, true)} · {relDay(i.deadline)}
              </span>
            )}
          </span>
        }
      />

      <div className="card mb-6 space-y-3">
        <div className="muted flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {i.modality && <span>📍 {i.modality}{i.location ? ` · ${i.location}` : ""}</span>}
          {i.pay && <span>💵 {i.pay}</span>}
          {i.url && (
            <a href={i.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">
              Abrir convocatoria ↗
            </a>
          )}
        </div>
        {i.notes && <p className="whitespace-pre-wrap text-sm">{i.notes}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ClaudeButton url={claudeUrl(prompt)} prompt={prompt} label="Avanzar con Claude" />
          <form action={setInternshipStatus} className="flex items-center gap-2">
            <input type="hidden" name="id" value={i.id} />
            <span className="muted text-sm">¿En qué voy?</span>
            <AutoSubmit>
              <Select name="status" options={INTERNSHIP_STATUS} defaultValue={i.status} className="input w-auto" />
            </AutoSubmit>
          </form>
        </div>
      </div>

      <Section title={`Pasos (${done}/${steps.length})`}>
        <ul className="card mb-3 divide-y divide-zinc-100 py-1 dark:divide-zinc-800/60">
          {steps.length === 0 && <li className="muted py-3 text-sm">Agrega los pasos para aplicar.</li>}
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2">
              <form action={toggleStep}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="internshipId" value={i.id} />
                <button
                  aria-label={s.done ? "Desmarcar" : "Marcar como hecho"}
                  className={`flex size-5 items-center justify-center rounded-md border text-xs ${
                    s.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-400 hover:border-indigo-500 dark:border-zinc-600"
                  }`}
                >
                  {s.done ? "✓" : ""}
                </button>
              </form>
              <details className="min-w-0 flex-1">
                <summary className="cursor-pointer list-none">
                  <span className={`text-sm ${s.done ? "muted line-through" : ""}`}>{s.title}</span>
                  {s.dueDate && (
                    <span className={`ml-2 text-xs ${!s.done && daysUntil(s.dueDate) < 0 ? "text-red-600 dark:text-red-400" : "muted"}`}>
                      {fmtDate(s.dueDate)} · {relDay(s.dueDate)}
                    </span>
                  )}
                </summary>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <form action={updateStep} className="flex flex-1 flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="internshipId" value={i.id} />
                    <input name="title" defaultValue={s.title} className="input min-w-40 flex-1" required />
                    <input name="dueDate" type="date" defaultValue={s.dueDate ?? ""} className="input w-auto" />
                    <SubmitButton className="btn-secondary">Guardar</SubmitButton>
                  </form>
                  <form action={deleteStep}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="internshipId" value={i.id} />
                    <ConfirmButton message="¿Borrar este paso?">Borrar</ConfirmButton>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <ResetOnSubmitForm action={addStep} className="card flex flex-wrap items-end gap-2">
          <input type="hidden" name="internshipId" value={i.id} />
          <label className="min-w-48 flex-1">
            <span className="label">Nuevo paso</span>
            <input name="title" className="input" required placeholder="Ej. Escribir carta de motivación" />
          </label>
          <label>
            <span className="label">Para</span>
            <input name="dueDate" type="date" className="input" />
          </label>
          <SubmitButton>Agregar paso</SubmitButton>
        </ResetOnSubmitForm>
      </Section>

      <Section title="Editar">
        <form action={updateInternship} className="card space-y-3">
          <input type="hidden" name="id" value={i.id} />
          <InternshipFields i={i} />
          <SubmitButton>Guardar cambios</SubmitButton>
        </form>
        <form action={deleteInternship} className="mt-3">
          <input type="hidden" name="id" value={i.id} />
          <ConfirmButton message="¿Borrar este internship y sus pasos?">Borrar internship</ConfirmButton>
        </form>
      </Section>
    </>
  );
}
