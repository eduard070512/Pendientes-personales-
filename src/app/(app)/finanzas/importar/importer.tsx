"use client";

import { useMemo, useState, useTransition } from "react";
import { guessCategory, learnKey } from "@/lib/categorize";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, TX_KIND } from "@/lib/constants";
import { fmtDate, monthLabel } from "@/lib/dates";
import { money } from "@/lib/format";
import { PdfPasswordError, pdfToText } from "@/lib/pdf-text";
import { parseStatement } from "@/lib/statement-parser";
import { importStatement, type ImportRow } from "../actions";

type Row = ImportRow & { include: boolean; key: number };

export function Importer({
  accounts,
  defaultStart,
  defaultEnd,
  learned,
}: {
  accounts: string[];
  defaultStart: string;
  defaultEnd: string;
  learned: Record<string, string>;
}) {
  const [account, setAccount] = useState(accounts[0] ?? "");
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(defaultEnd);
  const [credit, setCredit] = useState(true);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [pdfFile, setPdfFile] = useState<ArrayBuffer | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, startSaving] = useTransition();

  const cats = useMemo(() => [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])], []);

  async function readPdf(buf: ArrayBuffer, pwd?: string) {
    try {
      const t = await pdfToText(buf.slice(0), pwd);
      setText(t);
      setNeedsPassword(false);
      return t;
    } catch (e) {
      if (e instanceof PdfPasswordError) {
        setNeedsPassword(true);
        setMessage({ ok: false, text: e.message });
        return null;
      }
      setMessage({ ok: false, text: "No pude leer el PDF. Prueba copiando el texto y pegándolo abajo." });
      return null;
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    setRows(null);
    setFileName(file.name);
    setBusy(true);
    try {
      if (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf") {
        const buf = await file.arrayBuffer();
        setPdfFile(buf);
        const t = await readPdf(buf);
        if (t) analyze(t);
      } else {
        setPdfFile(null);
        const t = await file.text();
        setText(t);
        analyze(t);
      }
    } finally {
      setBusy(false);
    }
  }

  function analyze(source = text) {
    setMessage(null);
    const parsed = parseStatement(source, { periodStart, periodEnd, chargesPositive: credit });
    if (!parsed.length) {
      setRows([]);
      setMessage({ ok: false, text: "No encontré movimientos. Revisa que cada línea tenga fecha, descripción e importe." });
      return;
    }
    setRows(
      parsed.map((r, i) => ({
        ...r,
        key: i,
        include: !r.skip && (!periodStart || r.date >= periodStart) && (!periodEnd || r.date <= periodEnd),
        category: learned[learnKey(r.description)] ?? guessCategory(r.description, r.type),
        kind: "variable",
      })),
    );
  }

  function patch(key: number, p: Partial<Row>) {
    setRows((rs) => rs?.map((r) => (r.key === key ? { ...r, ...p } : r)) ?? null);
  }

  const selected = rows?.filter((r) => r.include) ?? [];
  const totalExpense = selected.filter((r) => r.type === "gasto").reduce((a, r) => a + r.amount, 0);
  const totalIncome = selected.filter((r) => r.type === "ingreso").reduce((a, r) => a + r.amount, 0);
  const byMonth = selected.reduce<Record<string, number>>((acc, r) => {
    const m = r.date.slice(0, 7);
    acc[m] = (acc[m] ?? 0) + 1;
    return acc;
  }, {});

  function save() {
    startSaving(async () => {
      const res = await importStatement({
        account,
        periodStart,
        periodEnd,
        fileName: fileName || "Texto pegado",
        rows: selected.map(({ date, description, amount, type, category, kind }) => ({ date, description, amount, type, category, kind })),
      });
      setMessage({
        ok: true,
        text: `Listo: ${res.inserted} movimientos importados${res.duplicates ? ` · ${res.duplicates} ya estaban y se omitieron` : ""}.`,
      });
      setRows(null);
      setText("");
      setFileName("");
      setPdfFile(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-6">
          <label className="sm:col-span-2">
            <span className="label">Tarjeta / cuenta</span>
            <input className="input" list="imp-accounts" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="BBVA Azul, Nu…" />
            <datalist id="imp-accounts">
              {accounts.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>
          <label className="sm:col-span-2">
            <span className="label">Periodo: desde (corte anterior)</span>
            <input type="date" className="input" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className="label">Hasta (fecha de corte)</span>
            <input type="date" className="input" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} />
          Es tarjeta de crédito (los cargos salen en positivo). Desmárcalo para cuenta de débito.
        </label>
        <p className="muted text-xs">
          Cada movimiento se guarda con su fecha real: un estado del 23 sep al 23 oct reparte sus gastos entre septiembre y octubre. Si el estado
          no trae el año en cada línea, lo deduzco del periodo.
        </p>
      </div>

      <div className="card space-y-3">
        <label className="block">
          <span className="label">Archivo del estado de cuenta (PDF, CSV o TXT)</span>
          <input
            type="file"
            accept=".pdf,.csv,.txt,.tsv,application/pdf,text/csv,text/plain"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-white"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        {needsPassword && pdfFile && (
          <div className="flex flex-wrap items-end gap-2">
            <label>
              <span className="label">Contraseña del PDF</span>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                setBusy(true);
                const t = await readPdf(pdfFile, password);
                setBusy(false);
                if (t) analyze(t);
              }}
            >
              Abrir
            </button>
          </div>
        )}
        <details>
          <summary className="muted cursor-pointer text-sm">…o pega aquí el texto (copiado del PDF o de la banca en línea)</summary>
          <textarea
            className="input mt-2 font-mono text-xs"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"24-SEP-2026  OXXO COLIMA  85.50\n02 OCT  NETFLIX.COM  299.00\n15/10  SU PAGO GRACIAS  3,500.00-"}
          />
        </details>
        <button type="button" className="btn-secondary" disabled={busy || !text.trim()} onClick={() => analyze()}>
          {busy ? "Leyendo…" : "Analizar"}
        </button>
      </div>

      {message && (
        <div className={`card text-sm ${message.ok ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300" : "border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300"}`}>
          {message.text}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="card space-y-3 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
            <div className="text-sm">
              <b>{selected.length}</b> de {rows.length} seleccionados · Gastos <b>{money(totalExpense)}</b> · Ingresos <b>{money(totalIncome)}</b>
              <div className="muted text-xs">
                Se registrarán en:{" "}
                {Object.entries(byMonth)
                  .sort()
                  .map(([m, n]) => `${monthLabel(m)} (${n})`)
                  .join(", ")}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setRows((rs) => rs?.map((r) => ({ ...r, include: true })) ?? null)}>
                Todos
              </button>
              <button type="button" className="btn-secondary" onClick={() => setRows((rs) => rs?.map((r) => ({ ...r, include: false })) ?? null)}>
                Ninguno
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="tbl min-w-[720px]">
              <thead>
                <tr>
                  <th className="pl-4" />
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Clase</th>
                  <th className="pr-4 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className={r.include ? "" : "opacity-45"}>
                    <td className="pl-4">
                      <input type="checkbox" checked={r.include} onChange={(e) => patch(r.key, { include: e.target.checked })} aria-label="Importar" />
                    </td>
                    <td className="whitespace-nowrap">
                      <input type="date" className="input w-36 py-1 text-xs" value={r.date} onChange={(e) => patch(r.key, { date: e.target.value })} />
                      <div className="muted text-[10px]">{fmtDate(r.date, true)}</div>
                    </td>
                    <td>
                      <input className="input py-1 text-xs" value={r.description} onChange={(e) => patch(r.key, { description: e.target.value })} />
                    </td>
                    <td>
                      <select className="input py-1 text-xs" value={r.type} onChange={(e) => patch(r.key, { type: e.target.value as Row["type"] })}>
                        <option value="gasto">Gasto</option>
                        <option value="ingreso">Ingreso</option>
                      </select>
                    </td>
                    <td>
                      <select className="input py-1 text-xs" value={r.category} onChange={(e) => patch(r.key, { category: e.target.value })}>
                        {[...new Set([r.category, ...cats])].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select className="input py-1 text-xs" value={r.kind} onChange={(e) => patch(r.key, { kind: e.target.value })}>
                        {TX_KIND.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={`pr-4 text-right tabular-nums ${r.type === "ingreso" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4">
            <p className="muted text-xs">
              Los pagos a la tarjeta (&quot;SU PAGO GRACIAS&quot;) vienen desmarcados: no son ingresos, solo mueven dinero entre tus cuentas.
            </p>
            <button type="button" className="btn-primary" disabled={saving || !selected.length || !account.trim()} onClick={save}>
              {saving ? "Importando…" : `Importar ${selected.length} movimientos`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
