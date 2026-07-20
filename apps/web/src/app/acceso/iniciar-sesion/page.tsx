import { Suspense } from 'react';

import { LoginForm } from './login-form';

import { AuthShell } from '@/components/auth-shell';

export const metadata = { title: 'Iniciar sesión — ContaIA' };

export default function LoginPage(): React.JSX.Element {
  return (
    <AuthShell title="Inicia sesión" description="Accede a tu cuenta de ContaIA.">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
