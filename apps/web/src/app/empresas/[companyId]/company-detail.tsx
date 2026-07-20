'use client';

import { Button, Card } from '@contaia/ui';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { CompanyAddressSection } from './company-address-section';
import { CompanyFiscalSection } from './company-fiscal-section';
import { CompanyGeneralSection } from './company-general-section';
import { CompanySettingsSection } from './company-settings-section';

import { useCompany } from '@/hooks/use-company';
import { ApiError } from '@/lib/http';

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  CONTADOR: 'Contador',
  AUXILIAR: 'Auxiliar',
  SUPERVISOR: 'Supervisor',
  AUDITOR: 'Auditor',
  ESTUDIANTE: 'Estudiante',
};

type SectionKey = 'general' | 'fiscal' | 'address' | 'settings';

const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: 'general', label: 'General' },
  { key: 'fiscal', label: 'Fiscal' },
  { key: 'address', label: 'Domicilio' },
  { key: 'settings', label: 'Configuración' },
];

/**
 * UI-0011 — Detalle de Empresa (layout Detalle), separado en 4 secciones
 * visuales (EWO-003 sección 11): general, fiscal, domicilio, configuración.
 * Editar cada sección solo está disponible para el Rol Administrador — el
 * mismo permiso (`company.update`/`company.fiscal.update`/
 * `company.settings.update`) que ya exige el backend, nunca inferido de
 * `isOwner` (BR-PERM-003: propietario no otorga permisos técnicos extra).
 */
export function CompanyDetail(): React.JSX.Element {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId;
  const [activeSection, setActiveSection] = useState<SectionKey>('general');

  const company = useCompany(companyId);

  if (company.isLoading) {
    return <p className="text-foreground dark:text-foreground-dark text-sm">Cargando empresa…</p>;
  }

  if (company.isError || !company.data) {
    const code = company.error instanceof ApiError ? company.error.detail.code : null;
    const message =
      code === 'AUTHORIZATION_ERROR'
        ? 'No tienes acceso a esta empresa.'
        : code === 'NOT_FOUND'
          ? 'Esta empresa no existe.'
          : 'No se pudo cargar esta empresa. Intenta de nuevo.';

    return (
      <div className="gap-sm flex flex-col items-start">
        <p className="text-danger text-sm">{message}</p>
        {code !== 'AUTHORIZATION_ERROR' && code !== 'NOT_FOUND' ? (
          <Button variant="secondary" onClick={() => void company.refetch()}>
            Reintentar
          </Button>
        ) : null}
      </div>
    );
  }

  const data = company.data;
  const canEditGeneral = data.role === 'ADMINISTRADOR';
  const canEditFiscal = data.role === 'ADMINISTRADOR';
  const canEditSettings = data.role === 'ADMINISTRADOR';

  return (
    <div className="gap-lg flex flex-col">
      <Card className="gap-md flex items-center justify-between">
        <p className="text-foreground dark:text-foreground-dark font-medium">
          {ROLE_LABELS[data.role] ?? data.role}
          {data.isOwner ? ' · Propietario' : ''}
        </p>
      </Card>

      <div role="tablist" className="gap-xs border-border dark:border-border-dark flex border-b">
        {SECTIONS.map((section) => (
          <button
            key={section.key}
            role="tab"
            type="button"
            aria-selected={activeSection === section.key}
            onClick={() => setActiveSection(section.key)}
            className={
              activeSection === section.key
                ? 'border-action px-sm pb-xs text-action border-b-2 text-sm font-medium'
                : 'px-sm pb-xs text-muted-foreground hover:text-foreground dark:text-muted-foreground-dark dark:hover:text-foreground-dark border-b-2 border-transparent text-sm'
            }
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === 'general' ? (
        <CompanyGeneralSection companyId={companyId} data={data} canEdit={canEditGeneral} />
      ) : null}
      {activeSection === 'fiscal' ? (
        <CompanyFiscalSection companyId={companyId} data={data} canEdit={canEditFiscal} />
      ) : null}
      {activeSection === 'address' ? (
        <CompanyAddressSection companyId={companyId} data={data} canEdit={canEditFiscal} />
      ) : null}
      {activeSection === 'settings' ? (
        <CompanySettingsSection companyId={companyId} data={data} canEdit={canEditSettings} />
      ) : null}
    </div>
  );
}
