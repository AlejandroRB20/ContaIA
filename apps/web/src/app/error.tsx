'use client';

import { useEffect } from 'react';

/**
 * Manejo global basico de errores de renderizado (App Router error boundary).
 * Nunca expone el detalle tecnico del error al usuario — mismo principio de
 * "mensajes de error seguros" ya fijado en docs/11_SECURITY_ARCHITECTURE.md
 * (seccion 12) y docs/13_DESIGN_SYSTEM.md (seccion 31).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    console.error('[apps/web] Error de renderizado no controlado:', error.digest ?? error.message);
  }, [error]);

  return (
    <main className="gap-md p-lg flex min-h-dvh flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold">Ocurrió un problema</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Algo no funcionó como se esperaba. Puedes intentar de nuevo.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-action px-md py-sm rounded-md font-medium text-white"
      >
        Reintentar
      </button>
    </main>
  );
}
