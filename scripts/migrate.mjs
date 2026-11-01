// Aplica las migraciones de ./drizzle a la base de datos.
// Se ejecuta en cada build (Vercel) y con `npm run db:migrate`.
const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("[migrate] DATABASE_URL no está definida; se omiten las migraciones.");
  process.exit(0);
}

if (/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  const { default: pg } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const pool = new pg.Pool({ connectionString: url });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
} else {
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const { migrate } = await import("drizzle-orm/neon-http/migrator");
  await migrate(drizzle(neon(url)), { migrationsFolder: "./drizzle" });
}
console.log("[migrate] Base de datos al día.");
