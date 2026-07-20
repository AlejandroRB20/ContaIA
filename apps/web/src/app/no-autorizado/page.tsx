import Link from 'next/link';

import { AuthShell } from '@/components/auth-shell';

const primaryButtonClasses =
  'inline-flex h-10 w-full items-center justify-center rounded-sm bg-action px-md text-sm font-medium text-white hover:bg-action/90';

export const metadata = { title: 'No autorizado — ContaIA' };

export default function UnauthorizedPage(): React.JSX.Element {
  return (
    <AuthShell title="No has iniciado sesión" description="Inicia sesión para continuar.">
      <Link href="/acceso/iniciar-sesion" className={primaryButtonClasses}>
        Iniciar sesión
      </Link>
    </AuthShell>
  );
}
