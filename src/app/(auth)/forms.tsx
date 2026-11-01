"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type FormState, login, register, requestReset, resetPassword } from "./actions";

function Shell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="card space-y-4 p-6">
          <div>
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white" aria-hidden>
              ✓
            </div>
            <h1 className="h1">{title}</h1>
            <p className="muted text-sm">{subtitle}</p>
          </div>
          {children}
        </div>
        <div className="muted mt-4 text-center text-sm">{footer}</div>
      </div>
    </main>
  );
}

function Msg({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-emerald-700 dark:text-emerald-300">{state.ok}</p>;
  return null;
}

const link = "font-medium text-indigo-600 hover:underline dark:text-indigo-400";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <Shell title="Pendientes" subtitle="Inicia sesión para continuar." footer={<>¿No tienes cuenta? <Link href="/registro" className={link}>Regístrate gratis</Link></>}>
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="label">Correo</span>
          <input name="email" type="email" className="input" autoComplete="email" required defaultValue={state?.email} key={state?.email ?? "e"} autoFocus={!state} />
        </label>
        <label className="block">
          <span className="label">Contraseña</span>
          <input name="password" type="password" className="input" autoComplete="current-password" required autoFocus={!!state} />
        </label>
        <Msg state={state} />
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
        <div className="text-center text-sm">
          <Link href="/recuperar" className={link}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </form>
    </Shell>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, null);
  return (
    <Shell title="Crea tu cuenta" subtitle="Gratis. Organiza pendientes, escuela, trabajo, clientes y dinero." footer={<>¿Ya tienes cuenta? <Link href="/login" className={link}>Inicia sesión</Link></>}>
      <form action={action} className="space-y-4" key={state ? "s" : "i"}>
        <label className="block">
          <span className="label">Nombre</span>
          <input name="name" className="input" autoComplete="given-name" required defaultValue={state?.name} autoFocus />
        </label>
        <label className="block">
          <span className="label">Correo</span>
          <input name="email" type="email" className="input" autoComplete="email" required defaultValue={state?.email} />
        </label>
        <label className="block">
          <span className="label">Contraseña (mínimo 8 caracteres)</span>
          <input name="password" type="password" className="input" autoComplete="new-password" required minLength={8} />
        </label>
        <label className="block">
          <span className="label">Repite la contraseña</span>
          <input name="password2" type="password" className="input" autoComplete="new-password" required minLength={8} />
        </label>
        <Msg state={state} />
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
    </Shell>
  );
}

export function RecoverForm() {
  const [state, action, pending] = useActionState(requestReset, null);
  return (
    <Shell title="Recupera tu contraseña" subtitle="Te mandamos un enlace a tu correo para crear una nueva." footer={<Link href="/login" className={link}>← Volver a iniciar sesión</Link>}>
      <form action={action} className="space-y-4">
        <label className="block">
          <span className="label">Correo de tu cuenta</span>
          <input name="email" type="email" className="input" autoComplete="email" required defaultValue={state?.email} autoFocus />
        </label>
        <Msg state={state} />
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>
    </Shell>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  return (
    <Shell title="Nueva contraseña" subtitle="Al guardarla se cierra tu sesión en los demás dispositivos." footer={<Link href="/recuperar" className={link}>Pedir otro enlace</Link>}>
      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <label className="block">
          <span className="label">Nueva contraseña (mínimo 8 caracteres)</span>
          <input name="password" type="password" className="input" autoComplete="new-password" required minLength={8} autoFocus />
        </label>
        <label className="block">
          <span className="label">Repítela</span>
          <input name="password2" type="password" className="input" autoComplete="new-password" required minLength={8} />
        </label>
        <Msg state={state} />
        <button className="btn-primary w-full" disabled={pending || !token}>
          {pending ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </Shell>
  );
}
