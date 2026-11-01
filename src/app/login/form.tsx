"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card w-full max-w-sm space-y-4 p-6">
      <div>
        <h1 className="h1">Pendientes</h1>
        <p className="muted text-sm">Inicia sesión para continuar.</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="label">Usuario</span>
        <input name="user" className="input" autoComplete="username" required autoFocus={!state} defaultValue={state?.user} key={state ? "u1" : "u0"} />
      </label>
      <label className="block">
        <span className="label">Contraseña</span>
        <input name="password" type="password" className="input" autoComplete="current-password" required autoFocus={!!state} />
      </label>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
