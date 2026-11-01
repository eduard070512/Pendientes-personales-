import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

// Solo revisa que la cookie esté firmada; la validación completa (usuario existe, sesión vigente) la hace requireUser().
export async function proxy(request: NextRequest) {
  if (await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  const url = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!login|registro|recuperar|restablecer|api/cron|api/ingest|_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|icon-maskable-512.png|apple-touch-icon.png|manifest.webmanifest|sw.js|pdf.worker.min.mjs).*)",
  ],
};
