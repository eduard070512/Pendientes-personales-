"use client";

import { useFormStatus } from "react-dom";
import { useRef } from "react";

export function SubmitButton({ children, className = "btn-primary", pendingText }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (pendingText ?? "Guardando…") : children}
    </button>
  );
}

/** Botón que pide confirmación antes de enviar el formulario (p. ej. borrar). */
export function ConfirmButton({ children, message = "¿Seguro?", className = "btn-danger" }: { children: React.ReactNode; message?: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Select o checkbox que guarda en cuanto cambia. */
export function AutoSubmit({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      onChange={() => {
        ref.current?.closest("form")?.requestSubmit();
      }}
    >
      {children}
    </span>
  );
}

/** Resetea el formulario tras enviarlo (para formularios de "agregar"). */
export function ResetOnSubmitForm({ action, children, className }: { action: (fd: FormData) => Promise<void>; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      className={className}
      action={async (fd) => {
        await action(fd);
        ref.current?.reset();
      }}
    >
      {children}
    </form>
  );
}
