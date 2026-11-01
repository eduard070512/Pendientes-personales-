import { PRIORITY } from "@/lib/constants";
import { Field, Select } from "./ui";

type Task = { title: string; description: string; dueDate: string | null; priority: string; category: string };

export function TaskFields({ task, categories }: { task?: Task; categories: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label="Pendiente" className="sm:col-span-6">
        <input name="title" className="input" required defaultValue={task?.title} placeholder="¿Qué tienes que hacer?" />
      </Field>
      <Field label="Fecha límite" className="sm:col-span-2">
        <input name="dueDate" type="date" className="input" defaultValue={task?.dueDate ?? ""} />
      </Field>
      <Field label="Prioridad" className="sm:col-span-2">
        <Select name="priority" options={PRIORITY} defaultValue={task?.priority ?? "media"} />
      </Field>
      <Field label="Categoría" className="sm:col-span-2">
        <input name="category" className="input" list="task-categories" defaultValue={task?.category} placeholder="Escuela, Trabajo…" />
        <datalist id="task-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Descripción / qué hay que hacer" className="sm:col-span-6">
        <textarea name="description" rows={3} className="input" defaultValue={task?.description} />
      </Field>
    </div>
  );
}
