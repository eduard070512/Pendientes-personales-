import Link from "next/link";
import { monthLabel, shiftMonth } from "@/lib/dates";

export function MonthPicker({ ym, base }: { ym: string; base: string }) {
  return (
    <div className="flex items-center gap-1">
      <Link href={`${base}?mes=${shiftMonth(ym, -1)}`} className="btn-secondary px-2.5" aria-label="Mes anterior">
        ‹
      </Link>
      <span className="min-w-36 text-center text-sm font-medium capitalize">{monthLabel(ym)}</span>
      <Link href={`${base}?mes=${shiftMonth(ym, 1)}`} className="btn-secondary px-2.5" aria-label="Mes siguiente">
        ›
      </Link>
    </div>
  );
}

export function parseMonth(v: string | undefined, fallback: string) {
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : fallback;
}
