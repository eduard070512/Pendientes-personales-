// Convierte un estado de cuenta (CSV exportado o texto copiado del PDF) en movimientos.
// Cada movimiento conserva SU fecha real, así que un estado del 23 sep al 23 oct
// reparte sus gastos entre septiembre y octubre automáticamente.

export type ParsedRow = {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positivo
  type: "ingreso" | "gasto";
  skip: boolean; // sugerencia: no importar (p. ej. pago a la tarjeta)
};

export type ParseOptions = {
  periodStart?: string | null;
  periodEnd?: string | null;
  /** true = tarjeta de crédito (cargos positivos son gastos). false = cuenta de débito (retiros negativos). */
  chargesPositive: boolean;
};

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

const MONTH_RE = "(ene|jan|feb|mar|abr|apr|may|jun|jul|ago|aug|sep|set|oct|nov|dic|dec)[a-z]*\\.?";
const DATE_PATTERNS: RegExp[] = [
  /^(\d{4})-(\d{1,2})-(\d{1,2})/, // 2026-09-23
  /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?(?!\d)/, // 23/09/2026, 23-09-26, 23/09
  new RegExp(`^(\\d{1,2})[\\s/-]*${MONTH_RE}(?:[\\s/-]*(\\d{2,4}))?(?![a-z\\d])`, "i"), // 23 SEP 2026, 23-sep, 23/Sep/26
];

const pad = (n: number) => String(n).padStart(2, "0");

function inferYear(month: number, dayN: number, opts: ParseOptions) {
  const ref = opts.periodEnd || opts.periodStart || new Date().toISOString().slice(0, 10);
  let year = Number(ref.slice(0, 4));
  const candidate = `${year}-${pad(month)}-${pad(dayN)}`;
  // Si la fecha queda más de ~1 mes después del cierre, pertenece al año anterior (estados dic → ene).
  const limit = new Date(`${ref}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 31);
  if (candidate > limit.toISOString().slice(0, 10)) year -= 1;
  return year;
}

function buildDate(y: number | null, m: number, d: number, opts: ParseOptions) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const year = y == null ? inferYear(m, d, opts) : y < 100 ? 2000 + y : y;
  const iso = `${year}-${pad(m)}-${pad(d)}`;
  const check = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(check.getTime()) || check.getUTCDate() !== d ? null : iso;
}

/** Busca una fecha al inicio del texto. Devuelve la fecha y cuántos caracteres ocupó. */
export function parseDateAtStart(text: string, opts: ParseOptions): { date: string; length: number } | null {
  const s = text.trimStart();
  const offset = text.length - s.length;
  for (const [i, re] of DATE_PATTERNS.entries()) {
    const m = s.match(re);
    if (!m) continue;
    let date: string | null = null;
    if (i === 0) date = buildDate(Number(m[1]), Number(m[2]), Number(m[3]), opts);
    else if (i === 1) date = buildDate(m[3] ? Number(m[3]) : null, Number(m[2]), Number(m[1]), opts);
    else date = buildDate(m[3] ? Number(m[3]) : null, MONTHS[m[2].toLowerCase().slice(0, 3)], Number(m[1]), opts);
    if (date) return { date, length: offset + m[0].length };
  }
  return null;
}

/** Interpreta importes como "1,234.56", "-$1,234.56", "1,234.56-", "(1,234.56)", "1234.56 CR". */
export function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/\s*(cr|abono)$/i.test(s)) {
    negative = true;
    s = s.replace(/\s*(cr|abono)$/i, "");
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  s = s.replace(/\s|\$|mxn/gi, "");
  // Formato con coma decimal (1.234,56)
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return negative ? -n : n;
}

const CARD_PAYMENT = /su pago|pago recibido|gracias por su pago|pago tdc|pago tarjeta|pago a tarjeta|pago spei recibido/i;

function toRow(date: string, description: string, signed: number, opts: ParseOptions): ParsedRow {
  const positiveIsExpense = opts.chargesPositive;
  const type: "ingreso" | "gasto" = (signed >= 0) === positiveIsExpense ? "gasto" : "ingreso";
  const desc = description.replace(/\s+/g, " ").trim() || "(sin descripción)";
  return {
    date,
    description: desc,
    amount: Math.abs(signed),
    type,
    skip: opts.chargesPositive && type === "ingreso" && CARD_PAYMENT.test(desc),
  };
}

/* ───────────── CSV ───────────── */

function splitCsvLine(line: string, sep: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function detectSeparator(lines: string[]) {
  const sample = lines.slice(0, 10).join("\n");
  const counts = [",", ";", "\t", "|"].map((s) => [s, sample.split(s).length] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > lines.slice(0, 10).length ? counts[0][0] : null;
}

const H = {
  date: /^(fecha|date|fecha de operaci[oó]n|fecha operaci[oó]n|fecha mov|f\. ?operaci[oó]n)/i,
  desc: /(descrip|concepto|detalle|description|movimiento|establecimiento|referencia)/i,
  amount: /^(importe|monto|amount|cantidad|valor)/i,
  charge: /(cargo|retiro|d[eé]bito|debit|egreso|salida)/i,
  credit: /(abono|dep[oó]sito|cr[eé]dito|credit|ingreso|entrada)/i,
};

function parseCsv(lines: string[], sep: string, opts: ParseOptions): ParsedRow[] | null {
  const rows = lines.map((l) => splitCsvLine(l, sep));
  const headerIdx = rows.findIndex((r) => r.some((c) => H.date.test(c)) && r.some((c) => H.desc.test(c) || H.amount.test(c) || H.charge.test(c)));
  if (headerIdx === -1) return null;
  const header = rows[headerIdx];
  const find = (re: RegExp, exclude: number[] = []) => header.findIndex((c, i) => re.test(c) && !exclude.includes(i));
  const iDate = find(H.date);
  const iDesc = find(H.desc, [iDate]);
  const iAmount = find(H.amount, [iDate, iDesc]);
  const iCharge = find(H.charge, [iDate, iDesc, iAmount]);
  const iCredit = find(H.credit, [iDate, iDesc, iAmount, iCharge]);
  if (iDate === -1 || (iAmount === -1 && iCharge === -1 && iCredit === -1)) return null;

  const out: ParsedRow[] = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const d = parseDateAtStart(r[iDate] ?? "", opts);
    if (!d) continue;
    const desc = iDesc >= 0 ? r[iDesc] ?? "" : "";
    if (iAmount >= 0 && parseAmount(r[iAmount] ?? "") != null) {
      out.push(toRow(d.date, desc, parseAmount(r[iAmount])!, opts));
      continue;
    }
    // Columnas separadas de cargo / abono: un cargo siempre es gasto y un abono siempre ingreso.
    const charge = iCharge >= 0 ? parseAmount(r[iCharge] ?? "") : null;
    const credit = iCredit >= 0 ? parseAmount(r[iCredit] ?? "") : null;
    if (charge) out.push(toRow(d.date, desc, opts.chargesPositive ? Math.abs(charge) : -Math.abs(charge), opts));
    else if (credit) out.push(toRow(d.date, desc, opts.chargesPositive ? -Math.abs(credit) : Math.abs(credit), opts));
  }
  return out;
}

/* ───────────── Texto copiado del PDF ───────────── */

const AMOUNT_AT_END =
  /(\(?[-+]?\s?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?-?(?:\s?(?:CR|MXN))?|\(?[-+]?\s?\$?\s?\d+\.\d{2}\)?-?(?:\s?(?:CR|MXN))?)\s*$/i;

function parseText(lines: string[], opts: ParseOptions): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\t/g, " ").trim();
    const d = parseDateAtStart(line, opts);
    if (!d) continue;
    let rest = line.slice(d.length).trim();
    // Muchos estados traen 2 fechas (operación y cargo): descarta la segunda.
    const second = parseDateAtStart(rest, opts);
    if (second) rest = rest.slice(second.length).trim();

    const m = rest.match(AMOUNT_AT_END);
    if (!m) continue;
    let amountText = m[1];
    let desc = rest.slice(0, m.index).trim();
    // Si hay dos importes al final (movimiento + saldo), el primero es el movimiento.
    const before = desc.match(AMOUNT_AT_END);
    if (before && parseAmount(before[1]) != null) {
      amountText = before[1];
      desc = desc.slice(0, before.index).trim();
    }
    const amount = parseAmount(amountText);
    if (amount == null || amount === 0) continue;
    out.push(toRow(d.date, desc, amount, opts));
  }
  return out;
}

export function parseStatement(text: string, opts: ParseOptions): ParsedRow[] {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = detectSeparator(lines);
  if (sep) {
    const csv = parseCsv(lines, sep, opts);
    if (csv && csv.length) return csv;
  }
  return parseText(lines, opts);
}
