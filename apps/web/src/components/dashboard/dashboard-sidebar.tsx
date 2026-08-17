import Link from 'next/link';
import type { ReactNode } from 'react';

import { LogoIcon } from '@/components/brand/logo-icon';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

export interface DashboardNavItem {
  readonly id: string;
  readonly label: string;
  /** Sin `href` → ítem visual/deshabilitado (módulo aún no disponible como ruta real). */
  readonly href?: string;
  readonly active?: boolean;
}

export interface DashboardNavGroup {
  readonly title?: string;
  readonly items: readonly DashboardNavItem[];
}

interface DashboardSidebarProps {
  readonly navGroups: readonly DashboardNavGroup[];
  readonly footer?: ReactNode;
}

/**
 * Sidebar visual fiel a `ContaIA Dashboard V2 (standalone) 2.html`
 * (EWO-frontend-ui-02): fondo navy, ítem activo resaltado, secciones
 * agrupadas por etiqueta. Componente presentacional — no decide navegación
 * real ni permisos; eso lo resuelve quien lo use (`/demo` con datos ficticios,
 * `/[companyId]` con Membership real).
 */
export function DashboardSidebar({ navGroups, footer }: DashboardSidebarProps): React.JSX.Element {
  return (
    <aside
      className="hidden h-full w-[252px] shrink-0 flex-col lg:flex"
      style={{ backgroundColor: DASHBOARD_COLORS.sidebar }}
    >
      <div className="flex h-16 items-center px-4">
        <LogoIcon onDark />
      </div>

      <nav
        aria-label="Navegación principal"
        className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2"
      >
        {navGroups.map((group, groupIndex) => (
          <div key={group.title ?? `group-${groupIndex}`} className="flex flex-col gap-1">
            {group.title ? (
              <span
                className="px-2 pb-1 text-[10.5px] font-bold uppercase"
                style={{ color: '#5C6D95', letterSpacing: '0.84px' }}
              >
                {group.title}
              </span>
            ) : null}
            {group.items.map((item) => {
              const itemStyle = item.active
                ? { backgroundColor: DASHBOARD_COLORS.sidebarActiveItem, color: '#FFFFFF' }
                : { color: '#A9B4D4' };
              const className =
                'rounded-lg px-3 py-2 text-[13px] font-medium transition-colors' +
                (item.active ? ' font-semibold' : '');

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={item.active ? 'page' : undefined}
                    className={className}
                    style={itemStyle}
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <span
                  key={item.id}
                  title="Próximamente"
                  aria-disabled="true"
                  className={`${className} cursor-not-allowed opacity-70`}
                  style={itemStyle}
                >
                  {item.label}
                </span>
              );
            })}
          </div>
        ))}
      </nav>

      {footer ? (
        <div className="border-t px-4 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {footer}
        </div>
      ) : null}
    </aside>
  );
}
