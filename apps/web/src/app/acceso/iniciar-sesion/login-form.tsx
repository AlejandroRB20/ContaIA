'use client';

import { Button, FormField, Input } from '@contaia/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useLogin } from '@/hooks/use-login';
import { useMfaChallenge } from '@/hooks/use-mfa-challenge';
import { useMfaEnrollment } from '@/hooks/use-mfa-enrollment';
import { fetchCurrentUser } from '@/lib/auth-client';
import { ApiError } from '@/lib/http';
import { safeInternalPath } from '@/lib/safe-navigation';

const credentialsSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
  rememberMe: z.boolean().optional(),
});
type CredentialsForm = z.infer<typeof credentialsSchema>;

const codeSchema = z.object({
  code: z.string().length(6, 'El código debe tener 6 dígitos.'),
});
type CodeForm = z.infer<typeof codeSchema>;

type Step =
  | { name: 'credentials' }
  | { name: 'mfa-challenge'; mfaChallengeToken: string }
  | {
      name: 'mfa-enrollment';
      mfaChallengeToken: string;
      otpAuthUrl: string;
      qrCodeDataUrl: string;
      secret: string;
    }
  | { name: 'mfa-enrollment-recovery-codes'; recoveryCodes: string[] };

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = safeInternalPath(searchParams.get('next'));

  const [step, setStep] = useState<Step>({ name: 'credentials' });
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useLogin();
  const { verifyCode } = useMfaChallenge();
  const { beginEnrollment, completeEnrollment } = useMfaEnrollment();

  const credentialsForm = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const challengeForm = useForm<CodeForm>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const enrollmentForm = useForm<CodeForm>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  /** UXF-0002 paso 5: una sola Empresa entra directo, varias van a PAGE-0005. */
  const navigateAfterLogin = async () => {
    const profile = await fetchCurrentUser();
    if (profile.memberships.length > 1) {
      router.push(`/seleccionar-empresa?next=${encodeURIComponent(destination)}`);
      return;
    }
    router.push(destination);
  };

  const onSubmitCredentials = credentialsForm.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await loginMutation.mutateAsync({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe ?? false,
      });

      if (result.mfaRequired) {
        setStep({ name: 'mfa-challenge', mfaChallengeToken: result.mfaChallengeToken });
        return;
      }

      if (result.mfaEnrollmentRequired) {
        const setup = await beginEnrollment.mutateAsync(result.mfaChallengeToken);
        setStep({
          name: 'mfa-enrollment',
          mfaChallengeToken: result.mfaChallengeToken,
          ...setup,
        });
        return;
      }

      await navigateAfterLogin();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.detail.message : 'No se pudo iniciar sesión.');
    }
  });

  const onSubmitChallenge = challengeForm.handleSubmit(async (values) => {
    if (step.name !== 'mfa-challenge') return;
    setFormError(null);

    try {
      const result = await verifyCode.mutateAsync({
        mfaChallengeToken: step.mfaChallengeToken,
        code: values.code,
      });
      if (!result.mfaRequired && !result.mfaEnrollmentRequired) {
        await navigateAfterLogin();
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.detail.message : 'Código inválido.');
    }
  });

  const onSubmitEnrollment = enrollmentForm.handleSubmit(async (values) => {
    if (step.name !== 'mfa-enrollment') return;
    setFormError(null);

    try {
      const result = await completeEnrollment.mutateAsync({
        mfaChallengeToken: step.mfaChallengeToken,
        code: values.code,
      });
      setStep({ name: 'mfa-enrollment-recovery-codes', recoveryCodes: result.recoveryCodes });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.detail.message : 'Código inválido.');
    }
  });

  if (step.name === 'mfa-enrollment-recovery-codes') {
    return (
      <div className="gap-md flex flex-col">
        <p className="text-success text-sm">
          Verificación en dos pasos activada. Guarda estos códigos de recuperación en un lugar
          seguro — cada uno solo funciona una vez y no volverán a mostrarse.
        </p>
        <ul className="gap-xs border-border p-sm dark:border-border-dark grid grid-cols-2 rounded-sm border font-mono text-sm">
          {step.recoveryCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <Button onClick={() => void navigateAfterLogin()}>Ya los guardé, continuar</Button>
      </div>
    );
  }

  if (step.name === 'mfa-enrollment') {
    return (
      <form onSubmit={onSubmitEnrollment} className="gap-md flex flex-col" noValidate>
        <p className="text-foreground dark:text-foreground-dark text-sm">
          Tu rol requiere verificación en dos pasos (BR-AUTH-002). Escanea este código QR con tu
          aplicación de autenticación (Google Authenticator, Authy, etc.) y confirma el código
          generado.
        </p>
        <img
          src={step.qrCodeDataUrl}
          alt="Código QR para configurar la verificación en dos pasos"
          className="mx-auto h-40 w-40"
        />
        <p className="text-muted-foreground dark:text-muted-foreground-dark text-center text-xs">
          ¿No puedes escanear? Ingresa este código manualmente: <br />
          <span className="font-mono">{step.secret}</span>
        </p>
        <FormField
          label="Código de verificación"
          error={enrollmentForm.formState.errors.code?.message}
        >
          <Input inputMode="numeric" maxLength={6} {...enrollmentForm.register('code')} />
        </FormField>
        {formError ? <p className="text-danger text-sm">{formError}</p> : null}
        <Button type="submit" isLoading={completeEnrollment.isPending}>
          Activar y continuar
        </Button>
      </form>
    );
  }

  if (step.name === 'mfa-challenge') {
    return (
      <form onSubmit={onSubmitChallenge} className="gap-md flex flex-col" noValidate>
        <p className="text-muted-foreground dark:text-muted-foreground-dark text-sm">
          Ingresa el código de 6 dígitos de tu aplicación de autenticación.
        </p>
        <FormField
          label="Código de verificación"
          error={challengeForm.formState.errors.code?.message}
        >
          <Input inputMode="numeric" maxLength={6} {...challengeForm.register('code')} />
        </FormField>
        {formError ? <p className="text-danger text-sm">{formError}</p> : null}
        <Button type="submit" isLoading={verifyCode.isPending}>
          Verificar
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmitCredentials} className="gap-md flex flex-col" noValidate>
      <FormField label="Correo electrónico" error={credentialsForm.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...credentialsForm.register('email')} />
      </FormField>
      <FormField label="Contraseña" error={credentialsForm.formState.errors.password?.message}>
        <Input
          type="password"
          autoComplete="current-password"
          {...credentialsForm.register('password')}
        />
      </FormField>
      <label className="gap-xs text-foreground dark:text-foreground-dark flex items-center text-sm">
        <input type="checkbox" {...credentialsForm.register('rememberMe')} />
        Mantener sesión iniciada
      </label>
      {formError ? <p className="text-danger text-sm">{formError}</p> : null}
      <Button type="submit" isLoading={loginMutation.isPending}>
        Iniciar sesión
      </Button>
      <div className="flex justify-between text-sm">
        <a href="/acceso/recuperar-contrasena" className="text-action hover:underline">
          ¿Olvidaste tu contraseña?
        </a>
        <a href="/acceso/registro" className="text-action hover:underline">
          Crear cuenta
        </a>
      </div>
    </form>
  );
}
