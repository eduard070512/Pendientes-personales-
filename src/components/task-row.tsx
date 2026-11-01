import Link from "next/link";
import { toggleTaskDone } from "@/app/(app)/pendientes/actions";
import { PRIORITY, TASK_STATUS, opt } from "@/lib/constants";
import { daysUntil, fmtDate, relDay } from "@/lib/dates";
import { Badge } from "./ui";

export type TaskRowData = {
  id: number;
  title: string;
  dueDate: string | null;
  status: string;
  priority: string;
  category: string;
};

export function TaskRow({ t }: { t: TaskRowData }) {
  const done = t.status === "hecho";
  const overdue = !done && t.dueDate && daysUntil(t.dueDate) < 0;
  const p = opt(PRIORITY, t.priority);
  return (
    <li className="flex items-center gap-3 border-b border-zinc-100 py-2.5 last:border-0 dark:border-zinc-800/60">
      <form action={toggleTaskDone}>
        <input type="hidden" name="id" value={t.id} />
        <button
          aria-label={done ? "Marcar como pendiente" : "Marcar como hecho"}
          className={`flex size-5 items-center justify-center rounded-md border text-xs ${
            done ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-400 hover:border-indigo-500 dark:border-zinc-600"
          }`}
        >
          {done ? "✓" : ""}
        </button>
      </form>
      <Link href={`/pendientes/${t.id}`} className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium ${done ? "muted line-through" : ""}`}>{t.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
          {t.dueDate && (
            <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : "muted"}>
              {fmtDate(t.dueDate)} · {relDay(t.dueDate)}
            </span>
          )}
          {t.category && <span className="muted">· {t.category}</span>}
        </div>
      </Link>
      <div className="flex shrink-0 gap-1">
        {t.status === "en_progreso" && <Badge tone="blue">{opt(TASK_STATUS, t.status).label}</Badge>}
        {!done && t.priority !== "media" && <Badge tone={p.tone}>{p.label}</Badge>}
      </div>
    </li>
  );
}
