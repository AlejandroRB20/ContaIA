'use client';

import { useParams } from 'next/navigation';

import { DashboardPreview } from '@/components/dashboard/dashboard-preview';
import { useSession } from '@/hooks/use-session';

/**
 * Dashboard inicial (EWO-004) — punto de entrada de la Empresa activa,
 * visualmente fiel a `ContaIA Dashboard V2 (standalone) 2.html`
 * (EWO-frontend-ui-02). El nombre de empresa viene de la sesión real; los
 * indicadores, la gráfica, las facturas y la actividad son datos de MOCK
 * centralizados en `lib/dashboard-mock-data.ts` hasta que exista el
 * contrato de API correspondiente.
 */
export default function InicioPage(): React.JSX.Element {
  const params = useParams();
  const companyId = typeof params.companyId === 'string' ? params.companyId : '';

  const session = useSession();
  const membership = session.data?.memberships.find((m) => m.companyId === companyId);

  return <DashboardPreview companyName={membership?.companyName ?? ''} />;
}
