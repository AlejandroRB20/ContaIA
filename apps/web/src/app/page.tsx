import Link from 'next/link';

import { HealthStatus } from '@/components/health-status';
import { getClientEnv } from '@/lib/env';

/**
 * Pagina tecnica de estado de EWO-001 — confirma unicamente que la
 * plataforma esta operativa (nombre, estado de frontend/backend, version,
 * ambiente). No es el Dashboard final (docs/18_UI_SPECIFICATION.md, sección 5)
 * — ese llega con su propio EWO funcional.
 */
export default function StatusPage(): React.JSX.Element {
  const env = getClientEnv();

  return (
    <main className="gap-md p-lg mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center text-center">
      <h1 className="text-brand text-3xl font-semibold dark:text-white">ContaIA</h1>
      <p className="text-slate-600 dark:text-slate-400">Base técnica en construcción</p>

      <div className="mt-lg gap-sm p-md flex w-full flex-col rounded-md border border-slate-200 text-left dark:border-slate-800">
        <p data-testid="frontend-status" className="text-success">
          Frontend: Operativo
        </p>
        <HealthStatus />
        <p className="text-slate-500">Versión: {env.NEXT_PUBLIC_APP_VERSION}</p>
        <p className="text-slate-500">Ambiente: {process.env.NODE_ENV}</p>
      </div>

      <Link href="/demo" className="text-action mt-md text-sm font-medium hover:underline">
        Ver dashboard de ContaIA →
      </Link>
    </main>
  );
}
