import type { Metadata } from 'next';

import { AssistantPanel } from '@/components/dashboard/assistant-panel';
import { DashboardPreview } from '@/components/dashboard/dashboard-preview';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import type { DashboardNavGroup } from '@/components/dashboard/dashboard-sidebar';
import {
  MOCK_ASSISTANT_GREETING,
  MOCK_ASSISTANT_SUGGESTIONS,
  MOCK_DEMO_COMPANY_INITIALS,
  MOCK_DEMO_COMPANY_NAME,
  MOCK_DEMO_USER,
} from '@/lib/dashboard-mock-data';

export const metadata: Metadata = {
  title: 'ContaIA — Vista previa del panel',
  description:
    'Vista previa pública del diseño del panel financiero de ContaIA, con datos de demostración. No requiere sesión ni backend.',
};

const NAV_GROUPS: readonly DashboardNavGroup[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/demo', active: true },
      { id: 'contabilidad', label: 'Contabilidad' },
      { id: 'documentos', label: 'Documentos' },
      { id: 'reportes', label: 'Reportes' },
    ],
  },
  {
    title: 'Inteligencia artificial',
    items: [{ id: 'asistente', label: 'Asistente IA' }],
  },
  {
    items: [{ id: 'configuracion', label: 'Configuración' }],
  },
];

/**
 * Vista previa pública del panel financiero — puerto fiel de
 * `ContaIA Dashboard V2 (standalone) 2.html` (EWO-frontend-ui-02). Sin
 * sesión, sin `companyId`, sin llamadas a `apps/api`: solo datos de
 * demostración centralizados en `lib/dashboard-mock-data.ts`. Declarada
 * pública en `middleware.ts` para que sea navegable sin cookie de sesión.
 */
export default function DemoDashboardPage(): React.JSX.Element {
  return (
    <div className="relative">
      <DashboardShell
        navGroups={NAV_GROUPS}
        companyName={MOCK_DEMO_COMPANY_NAME}
        companyInitials={MOCK_DEMO_COMPANY_INITIALS}
        userName={MOCK_DEMO_USER.nombre}
        userRole={MOCK_DEMO_USER.rol}
        userInitials={MOCK_DEMO_USER.iniciales}
        sidebarFooter={
          <div className="flex flex-col gap-0.5">
            <span className="text-[12.5px] font-semibold text-white">{MOCK_DEMO_USER.nombre}</span>
            <span className="text-[11px]" style={{ color: '#7C8AB0' }}>
              {MOCK_DEMO_COMPANY_NAME}
            </span>
          </div>
        }
      >
        <DashboardPreview companyName={MOCK_DEMO_COMPANY_NAME} />
      </DashboardShell>

      <div className="fixed bottom-5 right-5 z-30 hidden lg:block">
        <AssistantPanel
          greeting={MOCK_ASSISTANT_GREETING}
          suggestions={MOCK_ASSISTANT_SUGGESTIONS}
        />
      </div>
    </div>
  );
}
