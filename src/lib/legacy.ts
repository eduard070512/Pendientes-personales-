import "server-only";
import { isNull } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

/**
 * Los datos creados antes de que existieran las cuentas no tienen dueño (user_id = null).
 * Se le asignan a quien se registre con el correo de OWNER_EMAIL.
 */
export async function claimLegacyData(userId: number, email: string) {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!owner || owner !== email) return;
  const tables = [
    s.tasks, s.taskUpdates, s.internships, s.internshipSteps, s.jobs, s.jobEvents, s.clients, s.clientNotes,
    s.statements, s.recurring, s.transactions, s.debts, s.debtPayments, s.classroomItems,
  ];
  for (const t of tables) await db.update(t).set({ userId }).where(isNull(t.userId));
}
