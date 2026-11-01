// Lee las notificaciones de Google Classroom que llegan por correo y extrae la tarea.
// Es un respaldo de la API: el correo trae título, curso, enlace y (a veces) fecha de entrega.

export type ClassroomEmail = {
  subject?: string;
  from?: string;
  text?: string;
  html?: string;
  date?: string; // fecha del correo (ISO o RFC 2822)
};

export type EmailItem = {
  externalId: string;
  courseId: string;
  courseName: string;
  title: string;
  link: string;
  dueDate: string | null;
  dueTime: string | null;
  returned: boolean;
};

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

export function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi, " $1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n");
}

/** Los enlaces de Classroom codifican los ids numéricos en base64 (…/c/MTIz/a/NDU2/…). */
export function decodeClassroomId(key: string) {
  try {
    const s = Buffer.from(key.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    if (/^\d+$/.test(s)) return s;
  } catch {
    /* no era base64 */
  }
  return key;
}

function refDate(email: ClassroomEmail) {
  const d = email.date ? new Date(email.date) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function isoFrom(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Interpreta "5 nov", "5 de noviembre de 2026", "Nov 5, 2026", "mañana"… */
export function parseDueText(raw: string, ref: Date): { date: string | null; time: string | null } {
  const s = raw.toLowerCase();
  let date: string | null = null;
  const refIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(ref);
  const [ry, rm, rd] = refIso.split("-").map(Number);

  if (/\b(hoy|today)\b/.test(s)) date = refIso;
  else if (/\b(mañana|manana|tomorrow)\b/.test(s)) {
    const t = new Date(Date.UTC(ry, rm - 1, rd + 1));
    date = t.toISOString().slice(0, 10);
  } else {
    const es = s.match(/(\d{1,2})\s*(?:de\s+)?([a-záé]{3,})\.?(?:\s*(?:de|,)?\s*(\d{4}))?/);
    const en = s.match(/([a-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/);
    let y: number | null = null, m: number | null = null, d: number | null = null;
    if (es && MONTHS[es[2].slice(0, 3)]) {
      d = Number(es[1]); m = MONTHS[es[2].slice(0, 3)]; y = es[3] ? Number(es[3]) : null;
    } else if (en && MONTHS[en[1].slice(0, 3)]) {
      m = MONTHS[en[1].slice(0, 3)]; d = Number(en[2]); y = en[3] ? Number(en[3]) : null;
    } else {
      const num = s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
      if (num) {
        d = Number(num[1]); m = Number(num[2]); y = num[3] ? Number(num[3].length === 2 ? `20${num[3]}` : num[3]) : null;
      }
    }
    if (m && d && m <= 12 && d <= 31) {
      let year = y ?? ry;
      // Sin año: si la fecha quedó muy atrás del correo, es del año siguiente (p. ej. correo en dic, entrega en ene).
      if (!y && isoFrom(year, m, d) < isoFrom(ry, rm, rd) && rm - m > 6) year += 1;
      date = isoFrom(year, m, d);
    }
  }

  let time: string | null = null;
  const t = s.match(/(\d{1,2}):(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/);
  if (t) {
    let h = Number(t[1]);
    const pm = t[3]?.startsWith("p");
    const am = t[3]?.startsWith("a");
    if (pm && h < 12) h += 12;
    if (am && h === 12) h = 0;
    if (h < 24) time = `${pad(h)}:${t[2]}`;
  }
  return { date, time };
}

const TITLE_PATTERNS = [
  /(?:nueva tarea|new assignment|nueva pregunta|new question|tarea|assignment|recordatorio|reminder|due (?:today|tomorrow)|vence (?:hoy|mañana))[^:"“«]*:\s*["“«](.+?)["”»]/i,
  /["“«](.+?)["”»]/,
  /(?:nueva tarea|new assignment|nueva pregunta|new question)\s*:\s*(.+)/i,
];

export function parseClassroomEmail(email: ClassroomEmail): EmailItem | null {
  const from = (email.from ?? "").toLowerCase();
  const text = `${email.text ?? ""}\n${email.html ? htmlToText(email.html) : ""}`;
  if (!from.includes("classroom") && !/classroom\.google\.com/.test(text)) return null;

  const linkMatch = `${text}\n${email.html ?? ""}`.replace(/&amp;/g, "&").match(/https:\/\/classroom\.google\.com\/(?:u\/\d+\/)?c\/([\w-]+)\/(a|sa|mc|p)\/([\w-]+)(?:\/details)?/);
  if (!linkMatch) return null; // anuncios, materiales sin tarea, etc.
  const [link, courseKey, , workKey] = linkMatch;

  const subject = (email.subject ?? "").trim();
  let title = "";
  for (const re of TITLE_PATTERNS) {
    const m = subject.match(re);
    if (m) {
      title = m[1].trim();
      break;
    }
  }
  if (!title) title = subject.replace(/^(re|fwd?):\s*/i, "") || "Tarea de Classroom";

  const course =
    text.match(/(?:publicó|ha publicado|posted|agregó|added)\s+(?:una?\s+)?(?:nueva?\s+)?(?:tarea|pregunta|material|a new assignment|a new question|an assignment)\s+(?:en|in)\s+([^\n.]+)/i)?.[1] ??
    text.match(/(?:clase|class|curso|course)\s*:\s*([^\n]+)/i)?.[1] ??
    "";

  const dueLine = text.match(/(?:fecha de entrega|fecha l[ií]mite|entrega|vence|due)\s*:?\s*([^\n]{2,60})/i)?.[1] ?? "";
  const { date, time } = dueLine ? parseDueText(dueLine, refDate(email)) : { date: null, time: null };

  return {
    externalId: decodeClassroomId(workKey),
    courseId: decodeClassroomId(courseKey),
    courseName: course.replace(/\s+/g, " ").trim().slice(0, 120),
    title: title.slice(0, 300),
    link: link.endsWith("/details") ? link : `${link}/details`,
    dueDate: date,
    dueTime: time,
    returned: /devolvi[óo]|devuelta|calificad|returned|graded/i.test(subject),
  };
}
