'use client';

import { Button, Card } from '@contaia/ui';
import Link from 'next/link';

import { useCompanies } from '@/hooks/use-companies';

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  CONTADOR: 'Contador',
  AUXILIAR: 'Auxiliar',
  SUPERVISOR: 'Supervisor',
  AUDITOR: 'Auditor',
  ESTUDIANTE: 'Estudiante',
};

/**
 * UI-0010 — Listado de Empresas (layout Listado, docs/18_UI_SPECIFICATION.md
 * sección 16). Solo muestra las Empresas donde el usuario tiene Membresía
 * activa (BR-GLB-001) — nunca todas las Empresas de la plataforma.
 */
export function CompaniesList(): React.JSX.Element {
  const companies = useCompanies();

  if (companies.isLoading) {
    return (
      <p className="text-foreground dark:text-foreground-dark text-sm">Cargando tus empresas…</p>
    );
  }

  if (companies.isError || !companies.data) {
    return (
      <div className="gap-sm flex flex-col items-start">
        <p className="text-danger text-sm">No se pudo cargar el listado de empresas.</p>
        <Button variant="secondary" onClick={() => void companies.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const data = companies.data;

  if (data.length === 0) {
    return (
      <div className="gap-sm flex flex-col items-start">
        <p className="text-foreground dark:text-foreground-dark text-sm">
          Aún no tienes ninguna empresa. Crea la primera para empezar.
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
      {data.map((company) => (
        <Link key={company.companyId} href={`/empresas/${company.companyId}`}>
          <Card className="gap-md hover:bg-page dark:hover:bg-page-dark flex items-center justify-between">
            <div>
              <p className="text-foreground dark:text-foreground-dark font-medium">
                {company.name}
              </p>
              <p className="text-muted-foreground dark:text-muted-foreground-dark text-sm">
                {company.businessActivity}
              </p>
            </div>
            <p className="text-muted-foreground dark:text-muted-foreground-dark text-sm">
              {ROLE_LABELS[company.role] ?? company.role}
              {company.isOwner ? ' · Propietario' : ''}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
