'use client';

import { Button, Card, FormField, Input } from '@contaia/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useChangePassword } from '@/hooks/use-change-password';
import { useSession } from '@/hooks/use-session';
import { useUpdateProfile } from '@/hooks/use-update-profile';
import { ApiError } from '@/lib/http';
import { useSessionStore } from '@/store/use-session-store';

/**
 * Perfil personal del usuario autenticado — edición de nombre, teléfono y
 * cambio de contraseña (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md UI-0038/39).
 * No depende de la Empresa activa: esta ruta vive fuera de /[companyId]/.
 */
export default function ConfiguracionPersonalPage(): React.JSX.Element {
  const router = useRouter();
  const session = useSession();
  const activeCompanyId = useSessionStore((state) => state.activeCompanyId);

  // --- perfil ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  const updateProfile = useUpdateProfile();

  useEffect(() => {
    if (session.data) {
      setFirstName(session.data.firstName);
      setLastName(session.data.lastName);
      setPhone(session.data.phone ?? '');
    }
  }, [session.data]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSuccess(false);
    setProfileError('');

    updateProfile.mutate(
      {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || null,
      },
      {
        onSuccess: () => setProfileSuccess(true),
        onError: (err) => {
          setProfileError(
            err instanceof ApiError ? err.detail.message : 'Error al actualizar el perfil.',
          );
        },
      },
    );
  }

  // --- contraseña ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const changePassword = useChangePassword();

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSuccess(false);
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordSuccess(true);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => {
          setPasswordError(
            err instanceof ApiError ? err.detail.message : 'Error al cambiar la contraseña.',
          );
        },
      },
    );
  }

  function handleBack() {
    if (activeCompanyId) {
      router.push(`/${activeCompanyId}/inicio`);
    } else {
      router.push('/seleccionar-empresa');
    }
  }

  if (session.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="p-lg mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Volver
        </button>
        <h1 className="text-foreground dark:text-foreground-dark text-xl font-semibold">
          Perfil personal
        </h1>
      </div>

      {/* Datos personales */}
      <Card>
        <h2 className="text-foreground dark:text-foreground-dark mb-4 font-medium">
          Datos personales
        </h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nombre">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Tu nombre"
              />
            </FormField>
            <FormField label="Apellidos">
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Tus apellidos"
              />
            </FormField>
          </div>

          <FormField label="Correo electrónico">
            <Input value={session.data?.email ?? ''} disabled />
          </FormField>

          <FormField label="Teléfono (opcional)">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 55 0000 0000"
              type="tel"
            />
          </FormField>

          {profileSuccess && (
            <p className="text-success text-sm">Perfil actualizado correctamente.</p>
          )}
          {profileError && <p className="text-danger text-sm">{profileError}</p>}

          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </Card>

      {/* Cambio de contraseña */}
      <Card>
        <h2 className="text-foreground dark:text-foreground-dark mb-4 font-medium">
          Cambiar contraseña
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <FormField label="Contraseña actual">
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </FormField>

          <FormField label="Nueva contraseña">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </FormField>

          <FormField label="Confirmar nueva contraseña">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </FormField>

          <p className="text-muted-foreground dark:text-muted-foreground-dark text-xs">
            Al cambiar la contraseña se cerrarán todas tus sesiones activas.
          </p>

          {passwordSuccess && (
            <p className="text-success text-sm">Contraseña actualizada. Inicia sesión de nuevo.</p>
          )}
          {passwordError && <p className="text-danger text-sm">{passwordError}</p>}

          <Button type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
