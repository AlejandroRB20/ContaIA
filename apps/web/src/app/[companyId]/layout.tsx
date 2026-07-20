'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { AppShell } from './app-shell';

import { useMyPermissions } from '@/hooks/use-my-permissions';
import { useSession } from '@/hooks/use-session';
import { useSessionStore } from '@/store/use-session-store';

interface CompanyLayoutProps {
  children: ReactNode;
}

/**
 * Shell principal de la aplicación para rutas con contexto de Empresa.
 * Valida que el usuario tenga una Membresía activa en la Empresa del parámetro
 * de ruta (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md sección 11) y carga sus
 * permisos en Zustand (docs/12_FRONTEND_ARCHITECTURE.md sección 6).
 *
 * La empresa activa NO pertenece al servidor — reside en el estado del cliente
 * (Zustand). Cada petición al backend incluye companyId explícito en la ruta,
 * jamás en la sesión del servidor (docs/08_API_DESIGN.md sección 5).
 */
export default function CompanyLayout({ children }: CompanyLayoutProps): React.JSX.Element {
  const params = useParams();
  const companyId = typeof params.companyId === 'string' ? params.companyId : null;

  const router = useRouter();
  const pathname = usePathname();

  const session = useSession();
  const setActiveCompany = useSessionStore((state) => state.setActiveCompany);
  const activeCompanyId = useSessionStore((state) => state.activeCompanyId);

  useMyPermissions(companyId);

  useEffect(() => {
    if (session.isLoading || !companyId) return;

    if (session.isError || !session.data) {
      router.replace(`/acceso/iniciar-sesion?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const membership = session.data.memberships.find((m) => m.companyId === companyId);
    if (!membership) {
      router.replace(`/seleccionar-empresa?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (activeCompanyId !== companyId) {
      setActiveCompany(companyId);
    }
  }, [
    session.isLoading,
    session.isError,
    session.data,
    companyId,
    activeCompanyId,
    setActiveCompany,
    router,
    pathname,
  ]);

  if (session.isLoading || !companyId) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </div>
    );
  }

  if (session.isError || !session.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-danger text-sm">No se pudo cargar la sesión.</p>
      </div>
    );
  }

  const membership = session.data.memberships.find((m) => m.companyId === companyId);
  if (!membership) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground text-sm">Verificando acceso…</p>
      </div>
    );
  }

  return (
    <AppShell user={session.data} membership={membership} companyId={companyId}>
      {children}
    </AppShell>
  );
}
