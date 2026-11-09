const LINKEDIN =
  "https://www.linkedin.com/jobs/search/?keywords=Next.js%20OR%20n8n%20OR%20%22automation%20developer%22&location=Mexico&f_WT=2&f_E=1%2C2";

const SOURCES: { name: string; url: string; why: string }[] = [
  { name: "LinkedIn Jobs", url: LINKEDIN, why: "Búsqueda ya filtrada: remoto, México, prácticas y nivel junior (Next.js, n8n, automatización)." },
  { name: "Get on Board", url: "https://www.getonbrd.com/empleos-remoto", why: "La bolsa tech más grande de Latinoamérica; casi siempre publica el sueldo en USD." },
  { name: "Torre", url: "https://torre.ai", why: "Trabajo remoto en Latinoamérica con filtro por sueldo." },
  { name: "Revelo", url: "https://www.revelo.com", why: "Te conecta con empresas de EE. UU. que contratan en Latinoamérica." },
  { name: "Wellfound", url: "https://wellfound.com", why: "Startups; muchas vacantes remotas." },
  { name: "We Work Remotely", url: "https://weworkremotely.com", why: "Remoto global." },
  { name: "Remote OK", url: "https://remoteok.com", why: "Remoto global, con sueldo publicado." },
  { name: "Himalayas", url: "https://himalayas.app", why: "Remoto global, filtra por país donde contratan." },
  { name: "Upwork", url: "https://www.upwork.com", why: "Freelance. n8n + agentes de IA es un nicho con mucha demanda." },
  { name: "Contra", url: "https://contra.com", why: "Freelance sin comisión para el freelancer." },
  { name: "Comunidad n8n", url: "https://community.n8n.io", why: "Proyectos de automatización publicados directamente." },
];

/** Plataformas donde buscar trabajo remoto (meta: ≥ 20,000 MXN ≈ 1,100 USD al mes). */
export function JobSources({ open = false }: { open?: boolean }) {
  return (
    <details className="card mb-5" open={open}>
      <summary className="cursor-pointer text-sm font-medium">🔎 Dónde buscar trabajo remoto</summary>
      <p className="muted mt-2 text-xs">
        Cuando encuentres una vacante que te interese, regístrala arriba con su enlace para darle seguimiento.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {SOURCES.map((s) => (
          <li key={s.name}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-zinc-200 p-3 transition hover:border-indigo-400 dark:border-zinc-800"
            >
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{s.name} ↗</span>
              <span className="muted mt-0.5 block text-xs">{s.why}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
