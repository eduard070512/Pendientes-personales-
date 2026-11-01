type Opt = { value: string; label: string; tone: Tone };
export type Tone = "gray" | "blue" | "amber" | "green" | "red" | "violet";

export const TASK_STATUS: Opt[] = [
  { value: "pendiente", label: "Pendiente", tone: "gray" },
  { value: "en_progreso", label: "En progreso", tone: "blue" },
  { value: "hecho", label: "Hecho", tone: "green" },
];

export const PRIORITY: Opt[] = [
  { value: "alta", label: "Alta", tone: "red" },
  { value: "media", label: "Media", tone: "amber" },
  { value: "baja", label: "Baja", tone: "gray" },
];

export const INTERNSHIP_STATUS: Opt[] = [
  { value: "investigando", label: "Investigando", tone: "gray" },
  { value: "preparando", label: "Preparando", tone: "amber" },
  { value: "aplicado", label: "Aplicado", tone: "blue" },
  { value: "entrevista", label: "Entrevista", tone: "violet" },
  { value: "oferta", label: "Oferta", tone: "green" },
  { value: "rechazado", label: "Rechazado", tone: "red" },
  { value: "descartado", label: "Descartado", tone: "gray" },
];

export const JOB_STATUS: Opt[] = [
  { value: "guardado", label: "Guardado", tone: "gray" },
  { value: "aplicado", label: "CV enviado", tone: "blue" },
  { value: "entrevista", label: "Entrevista", tone: "violet" },
  { value: "oferta", label: "Oferta", tone: "green" },
  { value: "sin_respuesta", label: "Sin respuesta", tone: "amber" },
  { value: "rechazado", label: "Rechazado", tone: "red" },
];

export const CLIENT_STAGE: Opt[] = [
  { value: "prospecto", label: "Prospecto", tone: "gray" },
  { value: "contactado", label: "Contactado", tone: "blue" },
  { value: "demo", label: "Demo", tone: "violet" },
  { value: "propuesta", label: "Propuesta", tone: "amber" },
  { value: "negociacion", label: "Negociación", tone: "amber" },
  { value: "cliente", label: "Cliente", tone: "green" },
  { value: "perdido", label: "Perdido", tone: "red" },
];

export const MODALITY = ["Remoto", "Híbrido", "Presencial"];

export const TX_KIND: Opt[] = [
  { value: "variable", label: "Variable", tone: "gray" },
  { value: "fijo", label: "Fijo", tone: "blue" },
  { value: "extra", label: "Extra", tone: "violet" },
];

export const EXPENSE_CATEGORIES = [
  "Comida",
  "Súper",
  "Transporte",
  "Gasolina",
  "Servicios",
  "Renta",
  "Suscripciones",
  "Salud",
  "Educación",
  "Ropa",
  "Entretenimiento",
  "Compras en línea",
  "Trabajo/Negocio",
  "Deudas",
  "Comisiones e intereses",
  "Regalos",
  "Ahorro/Inversión",
  "Otros",
];

export const INCOME_CATEGORIES = ["Sueldo", "Clientes", "Freelance", "Becas", "Reembolsos", "Regalos", "Inversiones", "Otros"];

export function opt(list: Opt[], value: string) {
  return list.find((o) => o.value === value) ?? { value, label: value, tone: "gray" as Tone };
}
