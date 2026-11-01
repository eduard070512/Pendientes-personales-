export const TZ = "America/Mexico_City";

/** Hoy en formato YYYY-MM-DD en hora de México. */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = `${ym}-01`;
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { start, end, days: Number(end.slice(8)) };
}

export function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function monthLabel(ym: string, short = false) {
  const [y, m] = ym.split("-").map(Number);
  return short ? `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}` : `${MONTHS[m - 1]} ${y}`;
}

export function fmtDate(iso: string | null | undefined, withYear = false) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}${withYear ? ` ${y}` : ""}`;
}

export function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" }).format(d);
}

/** Días entre hoy y la fecha (negativo = vencida). */
export function daysUntil(iso: string) {
  const a = Date.parse(`${todayISO()}T00:00:00Z`);
  const b = Date.parse(`${iso}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function relDay(iso: string | null | undefined) {
  if (!iso) return "";
  const n = daysUntil(iso);
  if (n === 0) return "hoy";
  if (n === 1) return "mañana";
  if (n === -1) return "ayer";
  if (n < 0) return `hace ${-n} días`;
  return `en ${n} días`;
}
