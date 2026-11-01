// Plan 2026–2027 (ver internships.md). Se carga con un botón cuando la sección está vacía.
type Seed = {
  company: string;
  program: string;
  url: string;
  location: string;
  modality: string;
  pay: string;
  deadline: string | null;
  status: string;
  notes: string;
  steps: [string, string | null][];
};

export const INTERNSHIP_SEED: Seed[] = [
  {
    company: "Microsoft",
    program: "Explore (2.º año) · Verano 2027",
    url: "https://careers.microsoft.com/students",
    location: "Redmond, EE. UU.",
    modality: "Presencial",
    pay: "25.96–47.77 USD/h + reubicación (confirmar)",
    deadline: "2026-11-07",
    status: "preparando",
    notes: "Ventana: primera semana de cada mes (oct–dic). Puesto 200042628. Requiere intro a programación + 1 semestre de cálculo.",
    steps: [
      ["CV de 1 página en inglés (PDF)", "2026-11-03"],
      ["Actualizar LinkedIn (título, Open to work, inglés)", "2026-11-04"],
      ["Enviar solicitud (ventana 1–7 nov)", "2026-11-07"],
      ["Si no alcanzó: aplicar en ventana 1–7 dic", "2026-12-07"],
      ["Practicar entrevista conductual (STAR) en inglés", "2026-12-15"],
      ["Practicar LeetCode (arreglos, hash maps, BFS/DFS)", null],
    ],
  },
  {
    company: "Oracle",
    program: "Becario · Mexico Development Center",
    url: "https://careers.oracle.com",
    location: "Zapopan, Jal.",
    modality: "Híbrido",
    pay: "Pagado",
    deadline: "2026-11-30",
    status: "investigando",
    notes: "Proceso lento (2–3 meses). Preguntan SQL.",
    steps: [
      ["Buscar vacantes 'Intern' en Guadalajara/Zapopan", "2026-11-15"],
      ["Aplicar", "2026-11-30"],
      ["Repasar SQL (joins, group by, subconsultas)", "2026-12-15"],
    ],
  },
  {
    company: "Amazon",
    program: "SDE Intern (12 meses, 30 h/sem)",
    url: "https://www.amazon.jobs",
    location: "Guadalajara / CDMX",
    modality: "Presencial",
    pay: "Pagado",
    deadline: "2026-11-30",
    status: "investigando",
    notes: "",
    steps: [
      ["Buscar 'Software Development Engineer Intern' México", "2026-11-15"],
      ["Aplicar", "2026-11-30"],
      ["Preparar Leadership Principles (historias STAR)", "2026-12-15"],
    ],
  },
  {
    company: "IBM",
    program: "Prácticas desarrollo de software",
    url: "https://www.ibm.com/careers",
    location: "Guadalajara",
    modality: "Híbrido",
    pay: "Pagado",
    deadline: "2026-11-30",
    status: "investigando",
    notes: "",
    steps: [["Aplicar a prácticas de software/automatización", "2026-11-30"]],
  },
  {
    company: "Intel",
    program: "Software Engineering Intern",
    url: "https://jobs.intel.com",
    location: "Guadalajara",
    modality: "Híbrido",
    pay: "Pagado",
    deadline: "2026-11-30",
    status: "investigando",
    notes: "",
    steps: [["Aplicar", "2026-11-30"]],
  },
  {
    company: "Linux Foundation",
    program: "LFX Mentorship · Primavera 2027",
    url: "https://mentorship.lfx.linuxfoundation.org",
    location: "",
    modality: "Remoto",
    pay: "1,000–6,600 USD según país",
    deadline: "2027-02-10",
    status: "investigando",
    notes: "Proyectos salen ~mediados de enero; ~4 semanas para aplicar. Máximo 3 solicitudes.",
    steps: [
      ["Crear perfil en LFX", "2026-12-15"],
      ["Revisar proyectos publicados", "2027-01-15"],
      ["Aplicar a 2–3 proyectos", "2027-02-01"],
    ],
  },
  {
    company: "Google",
    program: "Summer of Code 2027",
    url: "https://summerofcode.withgoogle.com",
    location: "",
    modality: "Remoto",
    pay: "Beca USD (≈1,500–3,300)",
    deadline: "2027-03-31",
    status: "investigando",
    notes: "Fechas estimadas: organizaciones fin de feb, propuestas en marzo.",
    steps: [
      ["Elegir 2–3 organizaciones (TS/Node/Python/IA)", "2026-12-15"],
      ["Primeras contribuciones (good first issue)", "2027-01-31"],
      ["Revisar lista oficial de organizaciones 2027", "2027-02-28"],
      ["Enviar 1–3 propuestas", "2027-03-15"],
    ],
  },
  {
    company: "MLH",
    program: "MLH Fellowship · Verano 2027",
    url: "https://fellowship.mlh.io",
    location: "",
    modality: "Remoto",
    pay: "Beca según necesidad (hasta ~5,000 USD)",
    deadline: "2027-02-28",
    status: "investigando",
    notes: "Tandas durante todo el año.",
    steps: [["Aplicar a la tanda de verano", "2027-02-28"]],
  },
  {
    company: "Google",
    program: "Software Engineering Intern · CDMX",
    url: "https://www.google.com/about/careers/applications/jobs/results/?q=intern&location=Mexico",
    location: "CDMX",
    modality: "Híbrido",
    pay: "Pagado",
    deadline: "2027-04-20",
    status: "investigando",
    notes: "En 2026 abrió del 8 al 20 de abril; pedía vivir en CDMX.",
    steps: [["Vigilar la vacante (abre ~8 abr)", "2027-04-08"]],
  },
];
