import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();
const day = (name: string) => date(name, { mode: "string" });
const money = (name: string) => numeric(name, { precision: 12, scale: 2 });

/* ───────────── Usuarios ───────────── */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(), // siempre en minúsculas
  name: text("name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  bio: text("bio").notNull().default(""), // contexto que se le pasa a Claude
  plan: text("plan").notNull().default("free"), // free | pro (para cobrar en el futuro)
  sessionVersion: integer("session_version").notNull().default(1), // subirlo cierra todas las sesiones
  apiTokenHash: text("api_token_hash"), // token personal para n8n (se guarda solo el hash)
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** Dueño de cada registro. Es opcional solo para poder migrar los datos de antes de las cuentas. */
const owner = () => integer("user_id").references(() => users.id, { onDelete: "cascade" });

/* ───────────── Pendientes ───────────── */

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    userId: owner(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    dueDate: day("due_date"),
    status: text("status").notNull().default("pendiente"), // pendiente | en_progreso | hecho
    priority: text("priority").notNull().default("media"), // baja | media | alta
    category: text("category").notNull().default(""),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("tasks_due_idx").on(t.dueDate), index("tasks_user_idx").on(t.userId)],
);

export const taskUpdates = pgTable("task_updates", {
  id: serial("id").primaryKey(),
  userId: owner(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdAt: createdAt(),
});

/* ───────────── Internships ───────────── */

export const internships = pgTable("internships", {
  id: serial("id").primaryKey(),
  userId: owner(),
  company: text("company").notNull(),
  program: text("program").notNull().default(""),
  url: text("url").notNull().default(""),
  location: text("location").notNull().default(""),
  modality: text("modality").notNull().default(""), // remoto | presencial | híbrido
  pay: text("pay").notNull().default(""),
  deadline: day("deadline"),
  status: text("status").notNull().default("investigando"),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const internshipSteps = pgTable("internship_steps", {
  id: serial("id").primaryKey(),
  userId: owner(),
  internshipId: integer("internship_id")
    .notNull()
    .references(() => internships.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueDate: day("due_date"),
  done: boolean("done").notNull().default(false),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
});

/* ───────────── Trabajos ───────────── */

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  userId: owner(),
  company: text("company").notNull(),
  position: text("position").notNull().default(""),
  url: text("url").notNull().default(""),
  source: text("source").notNull().default(""), // LinkedIn, Get on Board, correo…
  contactName: text("contact_name").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  salary: text("salary").notNull().default(""),
  modality: text("modality").notNull().default(""),
  status: text("status").notNull().default("guardado"),
  appliedAt: day("applied_at"),
  nextFollowUp: day("next_follow_up"),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const jobEvents = pgTable("job_events", {
  id: serial("id").primaryKey(),
  userId: owner(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  date: day("date").notNull(),
  note: text("note").notNull(),
  createdAt: createdAt(),
});

/* ───────────── Clientes ───────────── */

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: owner(),
  name: text("name").notNull(),
  business: text("business").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  city: text("city").notNull().default(""),
  source: text("source").notNull().default(""),
  product: text("product").notNull().default(""),
  stage: text("stage").notNull().default("prospecto"),
  value: money("value"),
  nextFollowUp: day("next_follow_up"),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const clientNotes = pgTable("client_notes", {
  id: serial("id").primaryKey(),
  userId: owner(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  date: day("date").notNull(),
  note: text("note").notNull(),
  createdAt: createdAt(),
});

/* ───────────── Finanzas ───────────── */

export const statements = pgTable("statements", {
  id: serial("id").primaryKey(),
  userId: owner(),
  account: text("account").notNull(),
  periodStart: day("period_start"),
  periodEnd: day("period_end"),
  fileName: text("file_name").notNull().default(""),
  count: integer("count").notNull().default(0),
  createdAt: createdAt(),
});

export const recurring = pgTable("recurring", {
  id: serial("id").primaryKey(),
  userId: owner(),
  name: text("name").notNull(),
  type: text("type").notNull(), // ingreso | gasto
  amount: money("amount").notNull(),
  category: text("category").notNull().default(""),
  account: text("account").notNull().default(""),
  dayOfMonth: integer("day_of_month").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: owner(),
    date: day("date").notNull(),
    description: text("description").notNull(),
    amount: money("amount").notNull(), // siempre positivo; el signo lo da `type`
    type: text("type").notNull(), // ingreso | gasto
    kind: text("kind").notNull().default("variable"), // fijo | variable | extra
    category: text("category").notNull().default("Otros"),
    account: text("account").notNull().default(""),
    statementId: integer("statement_id").references(() => statements.id, { onDelete: "cascade" }),
    recurringId: integer("recurring_id").references(() => recurring.id, { onDelete: "set null" }),
    hash: text("hash"),
    createdAt: createdAt(),
  },
  (t) => [index("transactions_date_idx").on(t.userId, t.date), uniqueIndex("transactions_hash_idx").on(t.hash)],
);

export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  userId: owner(),
  name: text("name").notNull(),
  lender: text("lender").notNull().default(""),
  total: money("total").notNull(),
  interestRate: numeric("interest_rate", { precision: 6, scale: 2 }),
  minPayment: money("min_payment"),
  dueDay: integer("due_day"),
  notes: text("notes").notNull().default(""),
  closed: boolean("closed").notNull().default(false),
  createdAt: createdAt(),
});

export const debtPayments = pgTable("debt_payments", {
  id: serial("id").primaryKey(),
  userId: owner(),
  debtId: integer("debt_id")
    .notNull()
    .references(() => debts.id, { onDelete: "cascade" }),
  date: day("date").notNull(),
  amount: money("amount").notNull(),
  note: text("note").notNull().default(""),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/* ───────────── Classroom ───────────── */

export const classroomItems = pgTable(
  "classroom_items",
  {
    id: serial("id").primaryKey(),
    userId: owner(),
    externalId: text("external_id").notNull(), // id del courseWork en Classroom
    courseId: text("course_id").notNull().default(""),
    courseName: text("course_name").notNull().default(""),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    link: text("link").notNull().default(""),
    dueDate: day("due_date"), // en hora de México
    dueTime: text("due_time"), // HH:MM en hora de México
    state: text("state").notNull().default("pendiente"), // pendiente | entregada | devuelta
    late: boolean("late").notNull().default(false),
    maxPoints: numeric("max_points", { precision: 8, scale: 2 }),
    grade: numeric("grade", { precision: 8, scale: 2 }),
    workType: text("work_type").notNull().default(""),
    source: text("source").notNull().default("api"), // api | email
    taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("classroom_items_external_idx").on(t.userId, t.externalId), index("classroom_items_due_idx").on(t.dueDate)],
);

/** Ajustes clave-valor (tokens de Google, última sincronización…). */
export const settings = pgTable(
  "settings",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);
