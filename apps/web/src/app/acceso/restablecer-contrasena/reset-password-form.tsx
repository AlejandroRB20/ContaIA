'use client';

import { Button, FormField, Input } from '@contaia/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useConfirmPasswordReset } from '@/hooks/use-password-reset';
import { ApiError } from '@/lib/http';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{10,}$/;

const schema = z
  .object({
    newPassword: z
      .string()
      .min(10, 'Debe tener al menos 10 caracteres.')
      .regex(PASSWORD_PATTERN, 'Debe incluir mayúscula, minúscula, número y símbolo.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useConfirmPasswordReset();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  if (!token) {
    return (
      <p className="text-danger text-sm">
        El enlace no es válido. Solicita uno nuevo desde{' '}
        <a href="/acceso/recuperar-contrasena" className="underline">
          recuperar contraseña
        </a>
        .
      </p>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await mutation.mutateAsync({ token, newPassword: values.newPassword });
      router.push('/acceso/iniciar-sesion');
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.detail.message : 'No se pudo restablecer la contraseña.',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="gap-md flex flex-col" noValidate>
      <FormField label="Nueva contraseña" error={form.formState.errors.newPassword?.message}>
        <Input type="password" autoComplete="new-password" {...form.register('newPassword')} />
      </FormField>
      <FormField
        label="Confirmar contraseña"
        error={form.formState.errors.confirmPassword?.message}
      >
        <Input type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
      </FormField>
      {formError ? <p className="text-danger text-sm">{formError}</p> : null}
      <Button type="submit" isLoading={mutation.isPending}>
        Restablecer contraseña
      </Button>
    </form>
  );
}
