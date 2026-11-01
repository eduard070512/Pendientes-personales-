import "server-only";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { classroomItems, taskUpdates, tasks } from "@/db/schema";
import type { EmailItem } from "./classroom-email";
import { TZ } from "./dates";
import { accessToken } from "./google";
import { setSetting } from "./settings";

const API = "https://classroom.googleapis.com/v1";

type GDate = { year?: number; month?: number; day?: number };
type GTime = { hours?: number; minutes?: number };

async function getAll<T>(token: string, path: string, key: string): Promise<T[]> {
  const out: T[] = [];
  let pageToken = "";
  do {
    const url = `${API}${path}${path.includes("?") ? "&" : "?"}pageSize=100${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const json = (await res.json()) as Record<string, unknown> & { nextPageToken?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(json.error?.message || `Classroom respondió ${res.status}`);
    out.push(...((json[key] as T[]) ?? []));
    pageToken = json.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

/** Classroom da la fecha de entrega en UTC; la pasamos a hora de México. */
export function toLocalDue(d?: GDate, t?: GTime): { dueDate: string | null; dueTime: string | null } {
  if (!d?.year || !d.month || !d.day) return { dueDate: null, dueTime: null };
  if (!t) return { dueDate: `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`, dueTime: null };
  const utc = new Date(Date.UTC(d.year, d.month - 1, d.day, t.hours ?? 0, t.minutes ?? 0));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utc);
  const g = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { dueDate: `${g("year")}-${g("month")}-${g("day")}`, dueTime: `${g("hour")}:${g("minute")}` };
}

function mapState(s?: string) {
  if (s === "TURNED_IN") return "entregada";
  if (s === "RETURNED") return "devuelta";
  return "pendiente";
}

/** Si una tarea ligada a un pendiente ya se entregó, marca el pendiente como hecho. */
async function closeLinkedTasks(externalIds: string[]) {
  if (!externalIds.length) return;
  const done = await db
    .select({ taskId: classroomItems.taskId })
    .from(classroomItems)
    .innerJoin(tasks, eq(tasks.id, classroomItems.taskId))
    .where(
      and(
        inArray(classroomItems.externalId, externalIds),
        inArray(classroomItems.state, ["entregada", "devuelta"]),
        isNotNull(classroomItems.taskId),
        sql`${tasks.status} <> 'hecho'`,
      ),
    );
  for (const { taskId } of done) {
    if (!taskId) continue;
    await db.update(tasks).set({ status: "hecho", completedAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, taskId));
    await db.insert(taskUpdates).values({ taskId, note: "Entregada en Classroom ✓" });
  }
}

export async function syncFromApi() {
  const token = await accessToken();
  if (!token) throw new Error("Conecta tu cuenta de Google primero.");

  const courses = await getAll<{ id: string; name: string; section?: string }>(token, "/courses?studentId=me&courseStates=ACTIVE", "courses");
  let count = 0;
  const ids: string[] = [];
  for (const c of courses) {
    const [work, subs] = await Promise.all([
      getAll<{
        id: string; title: string; description?: string; alternateLink?: string; dueDate?: GDate; dueTime?: GTime;
        maxPoints?: number; workType?: string;
      }>(token, `/courses/${c.id}/courseWork`, "courseWork"),
      getAll<{ courseWorkId: string; state?: string; late?: boolean; assignedGrade?: number }>(
        token,
        `/courses/${c.id}/courseWork/-/studentSubmissions?userId=me`,
        "studentSubmissions",
      ),
    ]);
    const subBy = new Map(subs.map((s) => [s.courseWorkId, s]));
    const courseName = c.section ? `${c.name} · ${c.section}` : c.name;
    for (const w of work) {
      const s = subBy.get(w.id);
      const { dueDate, dueTime } = toLocalDue(w.dueDate, w.dueTime);
      const values = {
        externalId: w.id,
        courseId: c.id,
        courseName,
        title: w.title || "(sin título)",
        description: w.description ?? "",
        link: w.alternateLink ?? "",
        dueDate,
        dueTime,
        state: mapState(s?.state),
        late: Boolean(s?.late),
        maxPoints: w.maxPoints != null ? String(w.maxPoints) : null,
        grade: s?.assignedGrade != null ? String(s.assignedGrade) : null,
        workType: w.workType ?? "",
        source: "api",
      };
      const { externalId, ...update } = values;
      await db
        .insert(classroomItems)
        .values(values)
        .onConflictDoUpdate({ target: classroomItems.externalId, set: { ...update, updatedAt: new Date() } });
      ids.push(externalId);
      count++;
    }
  }
  await closeLinkedTasks(ids);
  await setSetting("classroom.last_sync", new Date().toISOString());
  return { courses: courses.length, items: count };
}

/** Guarda tareas leídas de correos. No pisa datos más completos que ya vinieron de la API. */
export async function upsertFromEmails(items: EmailItem[]) {
  let saved = 0;
  for (const it of items) {
    const [prev] = await db.select().from(classroomItems).where(eq(classroomItems.externalId, it.externalId));
    if (!prev) {
      await db.insert(classroomItems).values({
        externalId: it.externalId,
        courseId: it.courseId,
        courseName: it.courseName,
        title: it.title,
        link: it.link,
        dueDate: it.dueDate,
        dueTime: it.dueTime,
        state: it.returned ? "devuelta" : "pendiente",
        source: "email",
      });
    } else {
      await db
        .update(classroomItems)
        .set({
          courseName: prev.courseName || it.courseName,
          title: prev.source === "api" ? prev.title : it.title || prev.title,
          link: prev.link || it.link,
          dueDate: prev.dueDate ?? it.dueDate,
          dueTime: prev.dueTime ?? it.dueTime,
          state: it.returned ? "devuelta" : prev.state,
          updatedAt: new Date(),
        })
        .where(eq(classroomItems.id, prev.id));
    }
    saved++;
  }
  await closeLinkedTasks(items.map((i) => i.externalId));
  if (saved) await setSetting("classroom.last_email", new Date().toISOString());
  return saved;
}
