'use client';

import { useEffect, useRef } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { useLogout } from '@/hooks/use-logout';

export default function LogoutPage(): React.JSX.Element {
  const logout = useLogout();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;

    logout.mutate(undefined, {
      onSettled: () => {
        window.location.href = '/acceso/iniciar-sesion';
      },
    });
  }, [logout]);

  return (
    <AuthShell title="Cerrando sesión">
      <p className="text-foreground dark:text-foreground-dark text-sm">
        Cerrando tu sesión de forma segura…
      </p>
    </AuthShell>
  );
}
