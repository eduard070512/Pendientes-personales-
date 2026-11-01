import { NextResponse } from "next/server";
import { bearerOk } from "@/lib/api-auth";
import { syncFromApi } from "@/lib/classroom";
import { googleAccount } from "@/lib/google";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Sincroniza Classroom. Lo llama el cron de Vercel (GET) o n8n (GET/POST) con Bearer CRON_SECRET. */
async function handle(req: Request) {
  if (!bearerOk(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!(await googleAccount())) return NextResponse.json({ skipped: "Google no conectado" });
  try {
    return NextResponse.json({ ok: true, ...(await syncFromApi()) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
