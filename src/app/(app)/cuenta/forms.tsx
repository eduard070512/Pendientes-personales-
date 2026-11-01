"use client";

import { useActionState, useState } from "react";
import { type AccountState, changePassword, deleteAccount, regenerateToken, updateProfile } from "./actions";

function Msg({ state }: { state: AccountState }) {
  if (state?.error) return <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-emerald-700 dark:text-emerald-300">{state.ok}</p>;
  return null;
}

export function ProfileForm({ name, bio }: { name: string; bio: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="card space-y-3">
      <label className="block">
        <span className="label">Nombre</span>
        <input name="name" className="input" required defaultValue={name} />
      </label>
      <label className="block">
        <span className="label">Sobre mí (se le pasa a Claude como contexto)</span>
        <textarea
          name="bio"
          rows={4}
          className="input"
          defaultValue={bio}
          placeholder="Ej. 19 años, estudiante de Ingeniería en la U. de Colima, desarrollo backend y automatización (Next.js, TypeScript, n8n). Vendo menús digitales para restaurantes."
        />
      </label>
      <Msg state={state} />
      <button className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="card space-y-3" key={state?.ok ? "done" : "form"}>
      <label className="block">
        <span className="label">Contraseña actual</span>
        <input name="current" type="password" className="input" autoComplete="current-password" required />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Nueva (mínimo 8)</span>
          <input name="password" type="password" className="input" autoComplete="new-password" required minLength={8} />
        </label>
        <label className="block">
          <span className="label">Repite la nueva</span>
          <input name="password2" type="password" className="input" autoComplete="new-password" required minLength={8} />
        </label>
      </div>
      <Msg state={state} />
      <button className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

export function TokenBox({ hasToken }: { hasToken: boolean }) {
  const [state, action, pending] = useActionState(regenerateToken, null);
  const [copied, setCopied] = useState(false);
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        if (hasToken && !confirm("El token anterior dejará de funcionar en n8n. ¿Generar uno nuevo?")) e.preventDefault();
      }}
    >
      {state?.token && (
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-xs">Cópialo ahora: por seguridad no se vuelve a mostrar.</p>
          <code className="block break-all rounded bg-white p-2 text-xs dark:bg-zinc-950">{state.token}</code>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(state.token!);
              setCopied(true);
            }}
          >
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      )}
      <button className="btn-secondary" disabled={pending}>
        {pending ? "Generando…" : hasToken || state?.token ? "Generar token nuevo" : "Generar token"}
      </button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, null);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm">Se borran para siempre tu cuenta y todos tus datos (pendientes, clientes, finanzas, Classroom…).</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Escribe BORRAR</span>
          <input name="confirm" className="input" required autoComplete="off" />
        </label>
        <label className="block">
          <span className="label">Tu contraseña</span>
          <input name="password" type="password" className="input" required autoComplete="current-password" />
        </label>
      </div>
      <Msg state={state} />
      <button className="btn bg-red-600 text-white hover:bg-red-500" disabled={pending}>
        {pending ? "Borrando…" : "Borrar mi cuenta"}
      </button>
    </form>
  );
}
