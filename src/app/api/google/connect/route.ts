import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { authUrl, googleConfigured } from "@/lib/google";

export async function GET(req: NextRequest) {
  await requireUser();
  if (!googleConfigured()) return NextResponse.redirect(new URL("/classroom?error=config", req.url));
  const state = crypto.randomUUID();
  (await cookies()).set("g_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(authUrl(req.nextUrl.origin, state));
}
