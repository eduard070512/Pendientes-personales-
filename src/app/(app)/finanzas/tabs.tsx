"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/finanzas", label: "Resumen" },
  { href: "/finanzas/movimientos", label: "Movimientos" },
  { href: "/finanzas/fijos", label: "Fijos" },
  { href: "/finanzas/deudas", label: "Deudas" },
  { href: "/finanzas/importar", label: "Importar estado de cuenta" },
];

export function FinanceTabs() {
  const path = usePathname();
  const mes = useSearchParams().get("mes");
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
      {TABS.map((t) => {
        const active = path === t.href;
        const keepMonth = mes && t.href !== "/finanzas/importar" && t.href !== "/finanzas/deudas";
        return (
          <Link
            key={t.href}
            href={keepMonth ? `${t.href}?mes=${mes}` : t.href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              active ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "muted border-transparent hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
