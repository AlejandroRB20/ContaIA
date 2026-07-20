import { Suspense } from 'react';

import { ResetPasswordForm } from './reset-password-form';

import { AuthShell } from '@/components/auth-shell';

export const metadata = { title: 'Restablecer contraseña — ContaIA' };

export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <AuthShell title="Restablece tu contraseña">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
