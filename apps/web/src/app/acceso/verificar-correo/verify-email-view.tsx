'use client';

import { Button, Input } from '@contaia/ui';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useResendVerification, useVerifyEmail } from '@/hooks/use-verify-email';
import { ApiError } from '@/lib/http';

type Status = 'verifying' | 'success' | 'error' | 'missing-token';

export function VerifyEmailView(): React.JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const verifyEmail = useVerifyEmail();
  const resend = useResendVerification();
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'missing-token');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    verifyEmail.mutate(token, {
      onSuccess: () => setStatus('success'),
      onError: (error) => {
        setStatus('error');
        setErrorMessage(
          error instanceof ApiError ? error.detail.message : 'No se pudo verificar el correo.',
        );
      },
    });
  }, [token, verifyEmail]);

  if (status === 'verifying') {
    return (
      <p className="text-foreground dark:text-foreground-dark text-sm">Verificando tu correo…</p>
    );
  }

  if (status === 'success') {
    return (
      <div className="gap-md flex flex-col">
        <p className="text-success text-sm">Tu correo fue verificado correctamente.</p>
        <Button onClick={() => (window.location.href = '/acceso/iniciar-sesion')}>
          Iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="gap-md flex flex-col">
      <p className="text-danger text-sm">
        {status === 'missing-token' ? 'El enlace de verificación no es válido.' : errorMessage}
      </p>
      <ResendVerificationForm resend={resend} />
    </div>
  );
}

function ResendVerificationForm({
  resend,
}: {
  resend: ReturnType<typeof useResendVerification>;
}): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p className="text-foreground dark:text-foreground-dark text-sm">
        Si el correo existe, te reenviamos un nuevo enlace de verificación.
      </p>
    );
  }

  return (
    <form
      className="gap-sm flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        resend.mutate(email, { onSuccess: () => setSent(true) });
      }}
    >
      <Input
        type="email"
        required
        placeholder="tu@correo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button type="submit" variant="secondary" isLoading={resend.isPending}>
        Reenviar verificación
      </Button>
    </form>
  );
}
