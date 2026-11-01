import { NextResponse } from "next/server";
import { cronOk, userFromToken } from "@/lib/api-auth";
import { syncFromApi } from "@/lib/classroom";
import { connectedUserIds } from "@/lib/google";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Sincroniza Classroom.
 * - Con `Bearer CRON_SECRET` (cron de Vercel): todos los usuarios que conectaron Google.
 * - Con `Bearer <token personal>` (n8n): solo ese usuario.
 */
async function handle(req: Request) {
  let ids: number[];
  if (cronOk(req)) ids = await connectedUserIds();
  else {
    const uid = await userFromToken(req);
    if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    ids = [uid];
  }
  const results: { user: number; ok: boolean; items?: number; error?: string }[] = [];
  for (const uid of ids) {
    try {
      const r = await syncFromApi(uid);
      results.push({ user: uid, ok: true, items: r.items });
    } catch (e) {
      results.push({ user: uid, ok: false, error: (e as Error).message });
    }
  }
  return NextResponse.json({ synced: results.filter((r) => r.ok).length, results });
}

export const GET = handle;
export const POST = handle;
