import Link from 'next/link';

import { AuthShell } from '@/components/auth-shell';

const primaryButtonClasses =
  'inline-flex h-10 w-full items-center justify-center rounded-sm bg-action px-md text-sm font-medium text-white hover:bg-action/90';

export const metadata = { title: 'Acceso restringido — ContaIA' };

/**
 * docs/13_DESIGN_SYSTEM.md seccion 14: "Mensajes de 'no autorizado'
 * explican qué Rol se requiere, sin exponer datos de la operación
 * bloqueada."
 */
export default function ForbiddenPage(): React.JSX.Element {
  return (
    <AuthShell
      title="No tienes permiso para ver esto"
      description="Tu rol actual no tiene acceso a esta sección. Si crees que es un error, contacta al administrador de tu empresa."
    >
      <Link href="/" className={primaryButtonClasses}>
        Volver al inicio
      </Link>
    </AuthShell>
  );
}
