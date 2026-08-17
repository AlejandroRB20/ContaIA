import type { ReactNode } from 'react';

import { DashboardSidebar, type DashboardNavGroup } from '@/components/dashboard/dashboard-sidebar';
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

interface DashboardShellProps {
  readonly navGroups: readonly DashboardNavGroup[];
  readonly sidebarFooter?: ReactNode;
  readonly companyName: string;
  readonly companyInitials: string;
  readonly userName: string;
  readonly userRole: string;
  readonly userInitials: string;
  readonly onLogout?: () => void;
  readonly isLoggingOut?: boolean;
  readonly onSwitchCompany?: () => void;
  readonly children: ReactNode;
}

/**
 * Layout compartido (sidebar + topbar + contenido) del panel financiero,
 * fiel a `ContaIA Dashboard V2 (standalone) 2.html` (EWO-frontend-ui-02).
 * Usado tanto por `/demo` (sin sesión) como por `/[companyId]` (sesión
 * real) — evita duplicar el shell visual entre ambas rutas.
 */
export function DashboardShell({
  navGroups,
  sidebarFooter,
  companyName,
  companyInitials,
  userName,
  userRole,
  userInitials,
  onLogout,
  isLoggingOut,
  onSwitchCompany,
  children,
}: DashboardShellProps): React.JSX.Element {
  return (
    <div className="flex min-h-dvh" style={{ backgroundColor: DASHBOARD_COLORS.page }}>
      <DashboardSidebar navGroups={navGroups} footer={sidebarFooter} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          companyName={companyName}
          companyInitials={companyInitials}
          userName={userName}
          userRole={userRole}
          userInitials={userInitials}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
          onSwitchCompany={onSwitchCompany}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
