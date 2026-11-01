import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, TX_KIND } from "@/lib/constants";
import { Field, Select } from "./ui";

type T = { date: string; description: string; amount: string; type: string; kind: string; category: string; account: string };

export function TxFields({ t, accounts, defaultDate }: { t?: T; accounts: string[]; defaultDate: string }) {
  const cats = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label="Tipo" className="sm:col-span-2">
        <Select name="type" options={[{ value: "gasto", label: "Gasto" }, { value: "ingreso", label: "Ingreso" }]} defaultValue={t?.type ?? "gasto"} />
      </Field>
      <Field label="Monto (MXN)" className="sm:col-span-2">
        <input name="amount" inputMode="decimal" required className="input" defaultValue={t?.amount} placeholder="0.00" />
      </Field>
      <Field label="Fecha" className="sm:col-span-2">
        <input name="date" type="date" required className="input" defaultValue={t?.date ?? defaultDate} />
      </Field>
      <Field label="Descripción" className="sm:col-span-6">
        <input name="description" required className="input" defaultValue={t?.description} />
      </Field>
      <Field label="Categoría" className="sm:col-span-2">
        <input name="category" className="input" list="tx-categories" defaultValue={t?.category ?? ""} placeholder="Comida, Sueldo…" />
        <datalist id="tx-categories">
          {cats.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Fijo / variable / extra" className="sm:col-span-2">
        <Select name="kind" options={TX_KIND} defaultValue={t?.kind ?? "variable"} />
      </Field>
      <Field label="Cuenta / tarjeta" className="sm:col-span-2">
        <input name="account" className="input" list="tx-accounts" defaultValue={t?.account} placeholder="Efectivo, BBVA…" />
        <datalist id="tx-accounts">
          {accounts.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </Field>
    </div>
  );
}
