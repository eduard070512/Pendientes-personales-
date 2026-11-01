import { INTERNSHIP_STATUS, MODALITY } from "@/lib/constants";
import { Field, Select } from "./ui";

type I = { company: string; program: string; url: string; location: string; modality: string; pay: string; deadline: string | null; status: string; notes: string };

export function InternshipFields({ i }: { i?: I }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label="Empresa" className="sm:col-span-3">
        <input name="company" className="input" required defaultValue={i?.company} />
      </Field>
      <Field label="Programa / puesto" className="sm:col-span-3">
        <input name="program" className="input" defaultValue={i?.program} />
      </Field>
      <Field label="Enlace" className="sm:col-span-6">
        <input name="url" type="url" className="input" defaultValue={i?.url} placeholder="https://" />
      </Field>
      <Field label="Ubicación" className="sm:col-span-2">
        <input name="location" className="input" defaultValue={i?.location} />
      </Field>
      <Field label="Modalidad" className="sm:col-span-2">
        <Select name="modality" options={["", ...MODALITY].map((m) => ({ value: m, label: m || "—" }))} defaultValue={i?.modality ?? ""} />
      </Field>
      <Field label="Fecha límite" className="sm:col-span-2">
        <input name="deadline" type="date" className="input" defaultValue={i?.deadline ?? ""} />
      </Field>
      <Field label="Pago / apoyos" className="sm:col-span-3">
        <input name="pay" className="input" defaultValue={i?.pay} />
      </Field>
      <Field label="Estado" className="sm:col-span-3">
        <Select name="status" options={INTERNSHIP_STATUS} defaultValue={i?.status ?? "investigando"} />
      </Field>
      <Field label="Notas" className="sm:col-span-6">
        <textarea name="notes" rows={3} className="input" defaultValue={i?.notes} />
      </Field>
    </div>
  );
}
