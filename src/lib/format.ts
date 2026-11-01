const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

export function money(n: number | string | null | undefined) {
  return mxn.format(Number(n ?? 0));
}

export function num(n: number | string | null | undefined) {
  return Number(n ?? 0);
}

/** Lee un campo de un FormData como texto recortado. */
export function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

export function optDate(fd: FormData, key: string) {
  const v = str(fd, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function optMoney(fd: FormData, key: string) {
  const v = str(fd, key).replace(/[$,\s]/g, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

export function optInt(fd: FormData, key: string) {
  const v = str(fd, key);
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function id(fd: FormData) {
  const n = Number(fd.get("id"));
  if (!Number.isInteger(n) || n <= 0) throw new Error("id inválido");
  return n;
}
