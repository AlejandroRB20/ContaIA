'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchBackendHealth } from '@/lib/api-client';

const STATUS_LABEL: Record<'ok' | 'degraded' | 'down', string> = {
  ok: 'Operativo',
  degraded: 'Degradado',
  down: 'No disponible',
};

const STATUS_CLASS: Record<'ok' | 'degraded' | 'down', string> = {
  ok: 'text-success',
  degraded: 'text-warning',
  down: 'text-danger',
};

/**
 * Estado del backend, consultado mediante GET /api/v1/health
 * (docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 5). Nunca oculta un fallo
 * de conexion como si fuera un estado desconocido — un backend inalcanzable
 * se comunica explicitamente (docs/13_DESIGN_SYSTEM.md seccion 31).
 */
export function HealthStatus(): React.JSX.Element {
  const { data, isPending, isError } = useQuery({
    queryKey: ['backend-health'],
    queryFn: fetchBackendHealth,
    refetchInterval: 15_000,
  });

  if (isPending) {
    return (
      <p data-testid="backend-status" className="text-slate-500">
        Backend: verificando…
      </p>
    );
  }

  if (isError || !data) {
    return (
      <p data-testid="backend-status" className={STATUS_CLASS.down}>
        Backend: no disponible
      </p>
    );
  }

  return (
    <p data-testid="backend-status" className={STATUS_CLASS[data.status]}>
      Backend: {STATUS_LABEL[data.status]}
    </p>
  );
}
