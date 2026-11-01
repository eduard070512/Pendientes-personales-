"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { InstallButton } from "./install-button";

export const NAV = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/pendientes", label: "Pendientes", icon: "✅" },
  { href: "/calendario", label: "Calendario", icon: "📅" },
  { href: "/classroom", label: "Classroom", icon: "📚" },
  { href: "/internships", label: "Internships", icon: "🎓" },
  { href: "/trabajos", label: "Trabajos", icon: "💼" },
  { href: "/clientes", label: "Clientes", icon: "🤝" },
  { href: "/finanzas", label: "Finanzas", icon: "💰" },
  { href: "/cuenta", label: "Mi cuenta", icon: "👤" },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

export function Sidebar({ logout, user }: { logout: () => Promise<void>; user: { name: string; email: string } }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-zinc-200 bg-white p-3 md:flex dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 px-2 pt-2 text-base font-semibold">Pendientes</div>
      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${
              isActive(path, n.href)
                ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <span aria-hidden>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-2">
        <div className="truncate px-2 text-xs">
          <div className="truncate font-medium">{user.name}</div>
          <div className="muted truncate">{user.email}</div>
        </div>
        <InstallButton className="btn-primary w-full" />
        <form action={logout}>
          <button className="btn-secondary w-full">Cerrar sesión</button>
        </form>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-900/90">
      <div className="flex gap-1 overflow-x-auto px-3 py-2">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm ${
              isActive(path, n.href)
                ? "bg-indigo-600 text-white"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            <span aria-hidden>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
