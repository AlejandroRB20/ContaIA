import Link from 'next/link';

import { AuthShell } from '@/components/auth-shell';

const primaryButtonClasses =
  'inline-flex h-10 w-full items-center justify-center rounded-sm bg-action px-md text-sm font-medium text-white hover:bg-action/90';

export const metadata = { title: 'Sesión expirada — ContaIA' };

export default function SessionExpiredPage(): React.JSX.Element {
  return (
    <AuthShell
      title="Tu sesión expiró"
      description="Por tu seguridad, cerramos tu sesión por inactividad (BR-AUTH-004)."
    >
      <Link href="/acceso/iniciar-sesion" className={primaryButtonClasses}>
        Iniciar sesión de nuevo
      </Link>
    </AuthShell>
  );
}
