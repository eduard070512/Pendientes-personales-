"use client";

import { useState } from "react";

/**
 * Abre Claude con el contexto del pendiente. Antes registra el inicio en el seguimiento
 * (si se pasa `onStart`). En el celular, claude.ai abre la app de Claude si la tienes.
 */
export function ClaudeButton({ url, prompt, onStart, label = "Trabajar con Claude" }: { url: string; prompt: string; onStart?: () => Promise<void>; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-claude"
        onClick={() => {
          onStart?.().catch(() => {});
        }}
      >
        <span aria-hidden>✳</span> {label}
      </a>
      <button
        type="button"
        className="btn-secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(prompt);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "¡Copiado!" : "Copiar contexto"}
      </button>
    </div>
  );
}
