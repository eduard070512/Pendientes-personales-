import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { syncFromApi } from "@/lib/classroom";
import { connectWithCode } from "@/lib/google";

export async function GET(req: NextRequest) {
  await requireAuth();
  const store = await cookies();
  const expected = store.get("g_state")?.value;
  store.delete("g_state");
  const p = req.nextUrl.searchParams;
  const back = (q: string) => NextResponse.redirect(new URL(`/classroom?${q}`, req.url));

  if (p.get("error")) return back(`error=${encodeURIComponent(p.get("error")!)}`);
  if (!expected || p.get("state") !== expected || !p.get("code")) return back("error=state");
  try {
    await connectWithCode(p.get("code")!, req.nextUrl.origin);
  } catch (e) {
    return back(`error=${encodeURIComponent((e as Error).message)}`);
  }
  try {
    await syncFromApi();
  } catch (e) {
    return back(`conectado=1&error=${encodeURIComponent((e as Error).message)}`);
  }
  return back("conectado=1");
}
