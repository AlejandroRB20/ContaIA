'use client';

import { Card } from '@contaia/ui';
import { useParams } from 'next/navigation';

import { useSession } from '@/hooks/use-session';

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  CONTADOR: 'Contador',
  AUXILIAR: 'Auxiliar',
  SUPERVISOR: 'Supervisor',
  AUDITOR: 'Auditor',
  ESTUDIANTE: 'Estudiante',
};

/**
 * Dashboard inicial (EWO-004) — punto de entrada de la Empresa activa.
 * La versión completa con indicadores y accesos rápidos llega en fases
 * posteriores (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md fase 2, UI-0008).
 */
export default function InicioPage(): React.JSX.Element {
  const params = useParams();
  const companyId = typeof params.companyId === 'string' ? params.companyId : '';

  const session = useSession();

  const membership = session.data?.memberships.find((m) => m.companyId === companyId);

  const userName = session.data ? `${session.data.firstName} ${session.data.lastName}` : '';
  const companyName = membership?.companyName ?? '';
  const roleName = membership ? (ROLE_LABELS[membership.role] ?? membership.role) : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground dark:text-foreground-dark text-2xl font-semibold">
          Bienvenido, {userName}
        </h1>
        <p className="text-muted-foreground dark:text-muted-foreground-dark mt-1 text-sm">
          {companyName} · {roleName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="space-y-1">
          <p className="text-muted-foreground dark:text-muted-foreground-dark text-xs uppercase tracking-wide">
            Módulo
          </p>
          <p className="text-foreground dark:text-foreground-dark font-medium">Contabilidad</p>
          <p className="text-muted-foreground dark:text-muted-foreground-dark text-sm">
            Próximamente
          </p>
        </Card>

        <Card className="space-y-1">
          <p className="text-muted-foreground dark:text-muted-foreground-dark text-xs uppercase tracking-wide">
            Módulo
          </p>
          <p className="text-foreground dark:text-foreground-dark font-medium">Documentos / CFDI</p>
          <p className="text-muted-foreground dark:text-muted-foreground-dark text-sm">
            Próximamente
          </p>
        </Card>

        <Card className="space-y-1">
          <p className="text-muted-foreground dark:text-muted-foreground-dark text-xs uppercase tracking-wide">
            Módulo
          </p>
          <p className="text-foreground dark:text-foreground-dark font-medium">Asistente IA</p>
          <p className="text-muted-foreground dark:text-muted-foreground-dark text-sm">
            Próximamente
          </p>
        </Card>
      </div>
    </div>
  );
}
