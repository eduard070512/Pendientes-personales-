import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "postgresql://missing:missing@localhost/missing";

// En producción (Neon) usa el driver HTTP; para desarrollo con un Postgres local usa `pg`.
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

// Ambos drivers exponen la misma API de consultas; se tipa con la de Neon.
export const db = (
  isLocal ? drizzlePg(new Pool({ connectionString: url }), { schema }) : drizzleNeon(neon(url), { schema })
) as NeonHttpDatabase<typeof schema>;
export { schema };
