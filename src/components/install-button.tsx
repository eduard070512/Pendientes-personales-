"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// El navegador avisa una sola vez que la app se puede instalar; lo guardamos para todo el sitio.
let deferred: PromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
  if ("serviceWorker" in navigator) {
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallButton({ className = "btn-secondary w-full" }: { className?: string }) {
  const prompt = useSyncExternalStore(subscribe, () => deferred, () => null);
  const justInstalled = useSyncExternalStore(subscribe, () => installed, () => false);
  const [env, setEnv] = useState<{ standalone: boolean; ios: boolean } | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setEnv({ standalone: isStandalone(), ios });
  }, []);

  if (!env || env.standalone || justInstalled) return null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
            await prompt.userChoice;
            deferred = null;
            notify();
          } else setHelp(true);
        }}
      >
        <span aria-hidden>⬇</span> Instalar app
      </button>

      {help && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setHelp(false)}>
          <div className="card w-full max-w-sm space-y-3" role="dialog" aria-modal="true" aria-label="Instalar app" onClick={(e) => e.stopPropagation()}>
            <h2 className="h2">Instalar Pendientes</h2>
            {env.ios ? (
              <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                <li>
                  Abre esta página en <b>Safari</b>.
                </li>
                <li>
                  Toca <b>Compartir</b> (el cuadro con la flecha ↑) en la barra de abajo.
                </li>
                <li>
                  Elige <b>Agregar a pantalla de inicio</b> y luego <b>Agregar</b>.
                </li>
              </ol>
            ) : (
              <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                <li>
                  Abre esta página en <b>Chrome</b> o <b>Edge</b>.
                </li>
                <li>
                  En el celular: menú <b>⋮ → Instalar app</b> (o <b>Agregar a pantalla principal</b>).
                </li>
                <li>
                  En la computadora: el ícono de <b>instalar</b> a la derecha de la barra de direcciones, o menú <b>⋮ → Transmitir, guardar y compartir → Instalar página como app</b>.
                </li>
              </ol>
            )}
            <button type="button" className="btn-primary w-full" onClick={() => setHelp(false)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
