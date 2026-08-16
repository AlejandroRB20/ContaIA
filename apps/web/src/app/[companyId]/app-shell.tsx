'use client';

import type { MembershipSummary, UserProfile } from '@contaia/types';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import type { DashboardNavGroup } from '@/components/dashboard/dashboard-sidebar';
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

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '');
  return letters.join('') || '—';
}

interface AppShellProps {
  user: UserProfile;
  membership: MembershipSummary;
  companyId: string;
  children: ReactNode;
}

/**
 * Shell principal de la aplicación: barra lateral + encabezado + contenido,
 * fiel al diseño de `ContaIA Dashboard V2 (standalone) 2.html`
 * (EWO-frontend-ui-02). La navegación se filtra por permisos del Rol actual
 * (cosmético — la autorización real siempre ocurre en el servidor,
 * docs/19_FRONTEND_IMPLEMENTATION_PLAN.md sección 11). Los módulos que
 * todavía no tienen ruta real (Contabilidad, Documentos, Reportes,
 * Asistente IA) se muestran sin `href` — visibles pero no navegables, para
 * no presentar funcionalidad falsa como real.
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

  const inicioHref = `/${companyId}/inicio`;
  const canReadCompanies = permissions.includes('company.read');

  const navGroups: DashboardNavGroup[] = [
    {
      title: 'Principal',
      items: [
        { id: 'inicio', label: 'Inicio', href: inicioHref, active: pathname === inicioHref },
        { id: 'contabilidad', label: 'Contabilidad' },
        { id: 'documentos', label: 'Documentos' },
        ...(canReadCompanies
          ? [
              {
                id: 'empresas',
                label: 'Empresas',
                href: '/empresas',
                active: pathname.startsWith('/empresas'),
              },
            ]
          : []),
      ],
    },
    {
      title: 'Inteligencia artificial',
      items: [{ id: 'asistente', label: 'Asistente IA' }],
    },
    {
      items: [
        {
          id: 'configuracion',
          label: 'Configuración',
          href: '/configuracion/personal',
          active: pathname.startsWith('/configuracion'),
        },
      ],
    },
  ];

  function handleSwitchCompany() {
    router.push(`/seleccionar-empresa?next=${inicioHref}`);
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
    <DashboardShell
      navGroups={navGroups}
      companyName={membership.companyName}
      companyInitials={initialsOf(membership.companyName)}
      userName={`${user.firstName} ${user.lastName}`}
      userRole={ROLE_LABELS[membership.role] ?? membership.role}
      userInitials={initialsOf(`${user.firstName} ${user.lastName}`)}
      onLogout={handleLogout}
      isLoggingOut={logout.isPending}
      onSwitchCompany={handleSwitchCompany}
      sidebarFooter={
        <div className="flex flex-col gap-0.5">
          <span className="text-[12.5px] font-semibold text-white">
            {user.firstName} {user.lastName}
          </span>
          <span className="text-[11px]" style={{ color: '#7C8AB0' }}>
            {membership.companyName}
          </span>
        </div>
      }
    >
      {children}
    </DashboardShell>
  );
}
