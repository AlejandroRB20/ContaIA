'use client';

import { Button, Card } from '@contaia/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useSession } from '@/hooks/use-session';
import { safeInternalPath } from '@/lib/safe-navigation';
import { useSessionStore } from '@/store/use-session-store';

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  CONTADOR: 'Contador',
  AUXILIAR: 'Auxiliar',
  SUPERVISOR: 'Supervisor',
  AUDITOR: 'Auditor',
  ESTUDIANTE: 'Estudiante',
};

/**
 * WF-0005 — Selección inicial de Empresa (docs/16_WIREFRAMES_SPECIFICATION.md
 * sección 10). Cambiar de Empresa activa no es una operación de API
 * (docs/08_API_DESIGN.md sección 5) — solo actualiza el estado del cliente.
 * El módulo Companies completo (crear empresa) llegó con EWO-003 —
 * brain/DECISIONS.md D-005 ya no restringe esta pantalla. Sin buscador
 * todavía (bajo volumen esperado de Empresas por usuario en el MVP).
 */
export function CompanySelector(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = safeInternalPath(searchParams.get('next'), '');
  // El destino por defecto es el dashboard de la empresa seleccionada
  // (/{companyId}/inicio) — se resuelve en el onClick con el companyId real.

  const session = useSession();
  const activeCompanyId = useSessionStore((state) => state.activeCompanyId);
  const setActiveCompany = useSessionStore((state) => state.setActiveCompany);

  if (session.isLoading) {
    return (
      <p className="text-foreground dark:text-foreground-dark text-sm">Cargando tus Empresas…</p>
    );
  }

  if (session.isError || !session.data) {
    return (
      <p className="text-danger text-sm">No se pudieron cargar tus Empresas. Intenta de nuevo.</p>
    );
  }

  const memberships = session.data.memberships;

  if (memberships.length === 0) {
    return (
      <div className="gap-sm flex flex-col items-start">
        <p className="text-foreground dark:text-foreground-dark text-sm">
          Aún no perteneces a ninguna Empresa. Espera una invitación de un Administrador o crea la
          tuya.
        </p>
        <Link
          href="/crear-empresa"
          className="bg-action px-md hover:bg-action/90 inline-flex h-10 items-center justify-center rounded-sm text-sm font-medium text-white"
        >
          Crear empresa
        </Link>
      </div>
    );
  }

  return (
    <div className="gap-sm flex w-full flex-col">
      {memberships.map((membership) => {
        const isActive = membership.companyId === activeCompanyId;
        return (
          <Card
            key={membership.id}
            className={
              isActive
                ? 'gap-md border-action flex items-center justify-between'
                : 'gap-md flex items-center justify-between'
            }
          >
            <div>
              <p className="text-foreground dark:text-foreground-dark font-medium">
                {membership.companyName}
                {isActive ? (
                  <span className="ml-xs bg-action/10 px-xs text-action rounded-sm py-0.5 text-xs font-medium">
                    Empresa activa
                  </span>
                ) : null}
              </p>
              <p className="text-muted-foreground dark:text-muted-foreground-dark text-sm">
                {ROLE_LABELS[membership.role] ?? membership.role}
              </p>
            </div>
            <Button
              variant={isActive ? 'secondary' : 'primary'}
              onClick={() => {
                setActiveCompany(membership.companyId);
                router.push(destination || `/${membership.companyId}/inicio`);
              }}
            >
              {isActive ? 'Continuar' : 'Entrar'}
            </Button>
          </Card>
        );
      })}
      <Link href="/crear-empresa" className="text-action text-center text-sm hover:underline">
        + Crear otra empresa
      </Link>
    </div>
  );
}
