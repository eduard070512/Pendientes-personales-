import Link from "next/link";
import type { Tone } from "@/lib/constants";

const TONES: Record<Tone, string> = {
  gray: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      {back && (
        <Link href={back.href} className="muted mb-2 inline-block text-sm hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="h1 break-words">{title}</h1>
          {subtitle && <div className="muted mt-1 text-sm">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Select({
  name,
  options,
  defaultValue,
  className = "input",
}: {
  name: string;
  options: (string | { value: string; label: string })[];
  defaultValue?: string | null;
  className?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? undefined} className={className}>
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card muted py-10 text-center text-sm">{children}</div>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-red-600 dark:text-red-400" : "";
  return (
    <div className="card">
      <div className="muted text-xs font-medium">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="muted mt-0.5 text-xs">{hint}</div>}
    </div>
  );
}

export function Section({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="h2">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Pestañas por URL (?tab=…). */
export function Tabs({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
            t.key === active
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "muted border-transparent hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
