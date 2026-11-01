"use client";

import { useState, useTransition } from "react";
import { syncNow } from "./actions";

export function SyncButton() {
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-end gap-1">
      <button className="btn-primary" disabled={pending} onClick={() => start(async () => setMsg(await syncNow()))}>
        {pending ? "Sincronizando…" : "↻ Sincronizar ahora"}
      </button>
      {msg && <span className={`text-xs ${msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{msg.message}</span>}
    </div>
  );
}
