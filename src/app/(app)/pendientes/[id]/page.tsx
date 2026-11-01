import type { Metadata } from "next";
import { desc, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { taskUpdates, tasks } from "@/db/schema";
import { ClaudeButton } from "@/components/claude-button";
import { AutoSubmit, ConfirmButton, ResetOnSubmitForm, SubmitButton } from "@/components/client";
import { TaskFields } from "@/components/task-fields";
import { Badge, PageHeader, Section, Select } from "@/components/ui";
import { appUrl, claudeUrl } from "@/lib/claude";
import { PRIORITY, TASK_STATUS, opt } from "@/lib/constants";
import { fmtDate, fmtDateTime, relDay } from "@/lib/dates";
import { addTaskUpdate, deleteTask, deleteTaskUpdate, setTaskStatus, startWithClaude, updateTask } from "../actions";

export const metadata: Metadata = { title: "Pendiente" };

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const taskId = Number((await params).id);
  if (!Number.isInteger(taskId)) notFound();
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) notFound();
  const updates = await db.select().from(taskUpdates).where(eq(taskUpdates.taskId, taskId)).orderBy(desc(taskUpdates.createdAt));
  const cats = (await db.selectDistinct({ c: tasks.category }).from(tasks).where(ne(tasks.category, ""))).map((r) => r.c);

  const history = updates
    .slice(0, 15)
    .reverse()
    .map((u) => `- ${fmtDateTime(u.createdAt)}: ${u.note}`)
    .join("\n");
  const link = appUrl(`/pendientes/${task.id}`);
  const prompt = [
    "Quiero avanzar con este pendiente y terminarlo contigo.",
    "",
    `Pendiente: ${task.title}`,
    task.dueDate ? `Fecha límite: ${fmtDate(task.dueDate, true)} (${relDay(task.dueDate)})` : "",
    `Prioridad: ${opt(PRIORITY, task.priority).label} · Estado: ${opt(TASK_STATUS, task.status).label}`,
    task.category ? `Categoría: ${task.category}` : "",
    task.description ? `\nDescripción:\n${task.description}` : "",
    history ? `\nSeguimiento hasta ahora:\n${history}` : "",
    "",
    "Ayúdame a: 1) dividirlo en pasos concretos, 2) empezar ya con el primero y hacerlo juntos.",
    "Cuando terminemos, dame un resumen de 1–3 líneas que pueda pegar como seguimiento en mi lista de pendientes.",
    link ? `(Mi pendiente: ${link})` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  const status = opt(TASK_STATUS, task.status);
  return (
    <>
      <PageHeader
        back={{ href: "/pendientes", label: "Pendientes" }}
        title={task.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge tone={opt(PRIORITY, task.priority).tone}>Prioridad {opt(PRIORITY, task.priority).label.toLowerCase()}</Badge>
            {task.dueDate && (
              <span>
                Para el {fmtDate(task.dueDate, true)} · {relDay(task.dueDate)}
              </span>
            )}
          </span>
        }
      />

      <div className="card mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ClaudeButton url={claudeUrl(prompt)} prompt={prompt} onStart={startWithClaude.bind(null, task.id)} />
          <form action={setTaskStatus} className="flex items-center gap-2">
            <input type="hidden" name="id" value={task.id} />
            <span className="muted text-sm">Estado</span>
            <AutoSubmit>
              <Select name="status" options={TASK_STATUS} defaultValue={task.status} className="input w-auto" />
            </AutoSubmit>
          </form>
        </div>
        <p className="muted text-xs">
          Abre Claude con todo el contexto de este pendiente (en el celular abre la app si la tienes). Al terminar, pega aquí abajo el resumen como seguimiento.
        </p>
      </div>

      <Section title="Seguimiento">
        <ResetOnSubmitForm action={addTaskUpdate} className="card mb-3 space-y-2">
          <input type="hidden" name="taskId" value={task.id} />
          <textarea name="note" rows={2} required className="input" placeholder="¿Qué avanzaste? ¿Qué sigue?" />
          <SubmitButton>Agregar seguimiento</SubmitButton>
        </ResetOnSubmitForm>
        {updates.length > 0 && (
          <ol className="card space-y-3">
            {updates.map((u) => (
              <li key={u.id} className="flex gap-3 text-sm">
                <div className="mt-1.5 size-2 shrink-0 rounded-full bg-indigo-500" />
                <div className="min-w-0 flex-1">
                  <div className="whitespace-pre-wrap break-words">{u.note}</div>
                  <div className="muted text-xs">{fmtDateTime(u.createdAt)}</div>
                </div>
                <form action={deleteTaskUpdate}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="taskId" value={task.id} />
                  <ConfirmButton message="¿Borrar esta nota?" className="btn-danger px-2 py-1 text-xs">
                    ✕
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Editar">
        <form action={updateTask} className="card space-y-3">
          <input type="hidden" name="id" value={task.id} />
          <TaskFields task={task} categories={cats} />
          <div className="flex justify-between">
            <SubmitButton>Guardar cambios</SubmitButton>
          </div>
        </form>
        <form action={deleteTask} className="mt-3">
          <input type="hidden" name="id" value={task.id} />
          <ConfirmButton message="¿Borrar este pendiente y su seguimiento?">Borrar pendiente</ConfirmButton>
        </form>
      </Section>
    </>
  );
}
