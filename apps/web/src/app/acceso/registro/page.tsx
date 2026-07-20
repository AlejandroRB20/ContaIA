import { Suspense } from 'react';

import { RegisterForm } from './register-form';

import { AuthShell } from '@/components/auth-shell';

export const metadata = { title: 'Crear cuenta — ContaIA' };

export default function RegisterPage(): React.JSX.Element {
  return (
    <AuthShell title="Crea tu cuenta" description="Empieza a usar ContaIA en minutos.">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
