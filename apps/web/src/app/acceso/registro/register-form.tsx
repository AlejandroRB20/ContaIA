'use client';

import { Button, FormField, Input } from '@contaia/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useRegister } from '@/hooks/use-register';
import { ApiError } from '@/lib/http';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{10,}$/;

const schema = z
  .object({
    email: z.string().email('Ingresa un correo válido.'),
    password: z
      .string()
      .min(10, 'Debe tener al menos 10 caracteres.')
      .regex(PASSWORD_PATTERN, 'Debe incluir mayúscula, minúscula, número y símbolo.'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'Ingresa tu nombre.').max(120),
    lastName: z.string().min(1, 'Ingresa tus apellidos.').max(120),
    acceptedTerms: z.boolean().refine((value) => value, {
      message: 'Debes aceptar los Términos y el Aviso de Privacidad.',
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

/** UXF-0001 — el correo de invitacion (WF-0004) puede prellenar el campo. */
export function RegisterForm(): React.JSX.Element {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get('email') ?? '';
  const next = searchParams.get('next');

  const [formError, setFormError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const registerMutation = useRegister();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: prefilledEmail,
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      acceptedTerms: false,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerMutation.mutateAsync({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      });
      setRegistered(true);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.detail.message : 'No se pudo crear la cuenta.',
      );
    }
  });

  if (registered) {
    const loginUrl = next
      ? `/acceso/iniciar-sesion?next=${encodeURIComponent(next)}`
      : '/acceso/iniciar-sesion';
    return (
      <div className="gap-md flex flex-col">
        <p className="text-success text-sm">
          Creamos tu cuenta. Revisa tu correo para verificarla antes de iniciar sesión.
        </p>
        <Button onClick={() => (window.location.href = loginUrl)}>Ir a iniciar sesión</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="gap-md flex flex-col" noValidate>
      <div className="gap-sm grid grid-cols-2">
        <FormField label="Nombre" error={form.formState.errors.firstName?.message}>
          <Input autoComplete="given-name" {...form.register('firstName')} />
        </FormField>
        <FormField label="Apellidos" error={form.formState.errors.lastName?.message}>
          <Input autoComplete="family-name" {...form.register('lastName')} />
        </FormField>
      </div>
      <FormField label="Correo electrónico" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </FormField>
      <FormField label="Contraseña" error={form.formState.errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </FormField>
      <FormField
        label="Confirmar contraseña"
        error={form.formState.errors.confirmPassword?.message}
      >
        <Input type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
      </FormField>
      <label className="gap-xs text-foreground dark:text-foreground-dark flex items-start text-sm">
        <input type="checkbox" className="mt-1" {...form.register('acceptedTerms')} />
        <span>Acepto los Términos y Condiciones y el Aviso de Privacidad de ContaIA.</span>
      </label>
      {form.formState.errors.acceptedTerms ? (
        <p className="text-danger text-sm">{form.formState.errors.acceptedTerms.message}</p>
      ) : null}
      {formError ? <p className="text-danger text-sm">{formError}</p> : null}
      <Button type="submit" isLoading={registerMutation.isPending}>
        Crear cuenta
      </Button>
      <a href="/acceso/iniciar-sesion" className="text-action text-center text-sm hover:underline">
        ¿Ya tienes cuenta? Inicia sesión
      </a>
    </form>
  );
}
