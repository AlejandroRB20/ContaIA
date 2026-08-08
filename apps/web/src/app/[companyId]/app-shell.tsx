'use client';

import type { MembershipSummary, UserProfile } from '@contaia/types';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { useLogout } from '@/hooks/use-logout';
import { useSessionStore } from '@/store/use-session-store';

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  CONTADOR: 'Contador',
  AUXILIAR: 'Auxiliar',
  SUPERVISOR: 'Supervisor',
  AUDITOR: 'Auditor',
  ESTUDIANTE: 'Estudiante',
};

interface NavItem {
  label: string;
  href: string;
  /** Permiso requerido para mostrar el ítem (undefined = visible para todos los roles). */
  permission?: string;
}

function buildNav(companyId: string): NavItem[] {
  return [
    { label: 'Inicio', href: `/${companyId}/inicio` },
    { label: 'Documentos', href: `/${companyId}/documentos`, permission: 'document.read' },
    { label: 'Empresas', href: '/empresas', permission: 'company.read' },
  ];
}

interface AppShellProps {
  user: UserProfile;
  membership: MembershipSummary;
  companyId: string;
  children: ReactNode;
}

/**
 * Shell principal de la aplicación: barra lateral + encabezado + contenido.
 * La navegación se filtra por permisos del Rol actual (cosmético — la
 * autorización real siempre ocurre en el servidor,
 * docs/19_FRONTEND_IMPLEMENTATION_PLAN.md sección 11).
 */
export function AppShell({
  user,
  membership,
  companyId,
  children,
}: AppShellProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const permissions = useSessionStore((state) => state.permissions);
  const logout = useLogout();

  const nav = buildNav(companyId).filter(
    (item) => !item.permission || permissions.includes(item.permission),
  );

  function handleSwitchCompany() {
    router.push('/seleccionar-empresa');
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSettled: () => {
        void queryClient.clear();
        router.replace('/acceso/iniciar-sesion');
      },
    });
  }

  return (
    <div className="flex min-h-dvh">
      {/* Barra lateral */}
      <aside className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex w-56 shrink-0 flex-col border-r">
        <div className="p-md border-border dark:border-border-dark border-b">
          <span className="text-brand text-lg font-semibold dark:text-white">ContaIA</span>
        </div>

        <nav className="p-sm flex-1 space-y-1">
          {nav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? 'bg-action/10 text-action block rounded px-3 py-2 text-sm font-medium'
                    : 'text-foreground dark:text-foreground-dark hover:bg-muted dark:hover:bg-muted-dark block rounded px-3 py-2 text-sm'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Empresa activa + cambio */}
        <div className="p-sm border-border dark:border-border-dark space-y-1 border-t">
          <p className="text-muted-foreground dark:text-muted-foreground-dark truncate px-3 text-xs">
            {membership.companyName}
          </p>
          <button
            onClick={handleSwitchCompany}
            className="text-muted-foreground hover:text-foreground dark:text-muted-foreground-dark dark:hover:text-foreground-dark w-full px-3 py-1 text-left text-xs"
          >
            Cambiar empresa
          </button>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Encabezado */}
        <header className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex h-14 shrink-0 items-center justify-between border-b px-6">
          <p className="text-foreground dark:text-foreground-dark text-sm font-medium">
            {membership.companyName}
            <span className="text-muted-foreground dark:text-muted-foreground-dark ml-2 text-xs font-normal">
              {ROLE_LABELS[membership.role] ?? membership.role}
            </span>
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/configuracion/personal"
              className="text-foreground dark:text-foreground-dark hover:text-action text-sm"
            >
              {user.firstName} {user.lastName}
            </Link>
            <button
              onClick={handleLogout}
              disabled={logout.isPending}
              className="text-muted-foreground hover:text-danger text-sm"
            >
              Salir
            </button>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
