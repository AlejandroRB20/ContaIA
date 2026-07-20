import { Suspense } from 'react';

import { VerifyEmailView } from './verify-email-view';

import { AuthShell } from '@/components/auth-shell';

export const metadata = { title: 'Verificar correo — ContaIA' };

export default function VerifyEmailPage(): React.JSX.Element {
  return (
    <AuthShell title="Verificación de correo">
      <Suspense fallback={null}>
        <VerifyEmailView />
      </Suspense>
    </AuthShell>
  );
}
