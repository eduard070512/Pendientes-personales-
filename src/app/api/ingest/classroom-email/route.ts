import { NextResponse } from "next/server";
import { bearerOk } from "@/lib/api-auth";
import { upsertFromEmails } from "@/lib/classroom";
import { parseClassroomEmail, type ClassroomEmail, type EmailItem } from "@/lib/classroom-email";

export const dynamic = "force-dynamic";

type Raw = Record<string, unknown>;

/** Acepta el formato del nodo Gmail de n8n (simple o completo) o {subject, from, text, html, date}. */
function normalize(raw: Raw): ClassroomEmail {
  const headers = (raw.headers ?? {}) as Record<string, string>;
  const fromObj = raw.from as { text?: string; value?: { address?: string }[] } | string | undefined;
  const from =
    typeof fromObj === "string" ? fromObj : fromObj?.text ?? fromObj?.value?.[0]?.address ?? (raw.From as string) ?? headers.from ?? "";
  return {
    subject: String(raw.subject ?? raw.Subject ?? headers.subject ?? ""),
    from,
    text: String(raw.text ?? raw.textPlain ?? raw.snippet ?? ""),
    html: String(raw.html ?? raw.textHtml ?? ""),
    date: String(raw.date ?? raw.internalDate ?? headers.date ?? ""),
  };
}

export async function POST(req: Request) {
  if (!bearerOk(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const list = (Array.isArray(body) ? body : (body as { emails?: unknown[] }).emails ?? [body]) as Raw[];
  const items: EmailItem[] = [];
  const ignored: string[] = [];
  for (const raw of list.slice(0, 200)) {
    const email = normalize(raw?.json ? (raw.json as Raw) : raw);
    const item = parseClassroomEmail(email);
    if (item) items.push(item);
    else ignored.push(email.subject ?? "");
  }
  const saved = await upsertFromEmails(items);
  return NextResponse.json({ ok: true, saved, ignored });
}
