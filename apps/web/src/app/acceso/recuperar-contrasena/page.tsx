'use client';

import { Button, FormField, Input } from '@contaia/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthShell } from '@/components/auth-shell';
import { useRequestPasswordReset } from '@/hooks/use-password-reset';

const schema = z.object({ email: z.string().email('Ingresa un correo válido.') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage(): React.JSX.Element {
  const [submitted, setSubmitted] = useState(false);
  const mutation = useRequestPasswordReset();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values.email);
    setSubmitted(true);
  });

  return (
    <AuthShell
      title="Recupera tu contraseña"
      description="Te enviaremos instrucciones para restablecerla."
    >
      {submitted ? (
        <p className="text-foreground dark:text-foreground-dark text-sm">
          Si el correo existe en ContaIA, recibirás instrucciones para restablecer tu contraseña en
          unos minutos.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="gap-md flex flex-col" noValidate>
          <FormField label="Correo electrónico" error={form.formState.errors.email?.message}>
            <Input type="email" autoComplete="email" {...form.register('email')} />
          </FormField>
          <Button type="submit" isLoading={mutation.isPending}>
            Enviar instrucciones
          </Button>
          <a
            href="/acceso/iniciar-sesion"
            className="text-action text-center text-sm hover:underline"
          >
            Volver a iniciar sesión
          </a>
        </form>
      )}
    </AuthShell>
  );
}
