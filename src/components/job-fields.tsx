import { JOB_STATUS, MODALITY } from "@/lib/constants";
import { Field, Select } from "./ui";

type J = {
  company: string; position: string; url: string; source: string; contactName: string; contactEmail: string;
  salary: string; modality: string; status: string; appliedAt: string | null; nextFollowUp: string | null; notes: string;
};

const SOURCES = ["LinkedIn", "Get on Board", "Torre", "Revelo", "Wellfound", "We Work Remotely", "Upwork", "Correo directo", "Referido", "Página de la empresa"];

export function JobFields({ j }: { j?: J }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label="Empresa" className="sm:col-span-3">
        <input name="company" className="input" required defaultValue={j?.company} />
      </Field>
      <Field label="Puesto" className="sm:col-span-3">
        <input name="position" className="input" defaultValue={j?.position} />
      </Field>
      <Field label="Enlace de la vacante" className="sm:col-span-4">
        <input name="url" type="url" className="input" defaultValue={j?.url} placeholder="https://" />
      </Field>
      <Field label="Dónde la encontré" className="sm:col-span-2">
        <input name="source" className="input" list="job-sources" defaultValue={j?.source} />
        <datalist id="job-sources">
          {SOURCES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Field>
      <Field label="Contacto" className="sm:col-span-3">
        <input name="contactName" className="input" defaultValue={j?.contactName} placeholder="Reclutador/a" />
      </Field>
      <Field label="Correo" className="sm:col-span-3">
        <input name="contactEmail" type="email" className="input" defaultValue={j?.contactEmail} />
      </Field>
      <Field label="Sueldo" className="sm:col-span-2">
        <input name="salary" className="input" defaultValue={j?.salary} placeholder="25,000 MXN / 1,500 USD" />
      </Field>
      <Field label="Modalidad" className="sm:col-span-2">
        <Select name="modality" options={["", ...MODALITY].map((m) => ({ value: m, label: m || "—" }))} defaultValue={j?.modality ?? ""} />
      </Field>
      <Field label="Estado" className="sm:col-span-2">
        <Select name="status" options={JOB_STATUS} defaultValue={j?.status ?? "guardado"} />
      </Field>
      <Field label="Fecha en que apliqué" className="sm:col-span-3">
        <input name="appliedAt" type="date" className="input" defaultValue={j?.appliedAt ?? ""} />
      </Field>
      <Field label="Próximo seguimiento" className="sm:col-span-3">
        <input name="nextFollowUp" type="date" className="input" defaultValue={j?.nextFollowUp ?? ""} />
      </Field>
      <Field label="Notas" className="sm:col-span-6">
        <textarea name="notes" rows={3} className="input" defaultValue={j?.notes} />
      </Field>
    </div>
  );
}
