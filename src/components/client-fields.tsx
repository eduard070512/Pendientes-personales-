import { CLIENT_STAGE } from "@/lib/constants";
import { Field, Select } from "./ui";

type C = {
  name: string; business: string; phone: string; email: string; city: string; source: string; product: string;
  stage: string; value: string | null; nextFollowUp: string | null; notes: string;
};

const PRODUCTS = ["Menú digital", "Menú digital + pedidos", "Página web", "Sistema de comandas", "Automatización"];
const SOURCES = ["Visita en persona", "WhatsApp", "Instagram", "Facebook", "Recomendación", "Google Maps"];

export function ClientFields({ c }: { c?: C }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label="Nombre del contacto" className="sm:col-span-3">
        <input name="name" className="input" required defaultValue={c?.name} />
      </Field>
      <Field label="Negocio" className="sm:col-span-3">
        <input name="business" className="input" defaultValue={c?.business} placeholder="Restaurante, cafetería…" />
      </Field>
      <Field label="Teléfono / WhatsApp" className="sm:col-span-2">
        <input name="phone" type="tel" className="input" defaultValue={c?.phone} placeholder="312 123 4567" />
      </Field>
      <Field label="Correo" className="sm:col-span-2">
        <input name="email" type="email" className="input" defaultValue={c?.email} />
      </Field>
      <Field label="Ciudad" className="sm:col-span-2">
        <input name="city" className="input" defaultValue={c?.city} />
      </Field>
      <Field label="Producto" className="sm:col-span-2">
        <input name="product" className="input" list="client-products" defaultValue={c?.product} />
        <datalist id="client-products">
          {PRODUCTS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </Field>
      <Field label="Cómo llegó" className="sm:col-span-2">
        <input name="source" className="input" list="client-sources" defaultValue={c?.source} />
        <datalist id="client-sources">
          {SOURCES.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </Field>
      <Field label="Etapa" className="sm:col-span-2">
        <Select name="stage" options={CLIENT_STAGE} defaultValue={c?.stage ?? "prospecto"} />
      </Field>
      <Field label="Valor (MXN)" className="sm:col-span-3">
        <input name="value" inputMode="decimal" className="input" defaultValue={c?.value ?? ""} placeholder="Ej. 1500" />
      </Field>
      <Field label="Próximo seguimiento" className="sm:col-span-3">
        <input name="nextFollowUp" type="date" className="input" defaultValue={c?.nextFollowUp ?? ""} />
      </Field>
      <Field label="Notas" className="sm:col-span-6">
        <textarea name="notes" rows={3} className="input" defaultValue={c?.notes} />
      </Field>
    </div>
  );
}
