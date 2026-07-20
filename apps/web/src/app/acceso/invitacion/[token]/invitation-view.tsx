'use client';

import { Button } from '@contaia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  useAcceptInvitation,
  useDeclineInvitation,
  useInvitationPreview,
} from '@/hooks/use-invitation';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/lib/http';

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  CONTADOR: 'Contador',
  AUXILIAR: 'Auxiliar',
  SUPERVISOR: 'Supervisor',
  AUDITOR: 'Auditor',
  ESTUDIANTE: 'Estudiante',
};

/** WF-0004 — Aceptar invitación (docs/16_WIREFRAMES_SPECIFICATION.md sección 10). */
export function InvitationView(): React.JSX.Element {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();

  const preview = useInvitationPreview(token);
  const session = useSession();
  const acceptMutation = useAcceptInvitation();
  const declineMutation = useDeclineInvitation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  if (preview.isLoading) {
    return (
      <p className="text-foreground dark:text-foreground-dark text-sm">Cargando invitación…</p>
    );
  }

  if (preview.isError || !preview.data || preview.data.status === 'NOT_FOUND') {
    return <p className="text-danger text-sm">Este enlace de invitación no es válido.</p>;
  }

  const invitation = preview.data;

  if (invitation.status === 'EXPIRED') {
    return (
      <p className="text-danger text-sm">
        Esta invitación expiró. Pide a tu Administrador en {invitation.companyName} que te envíe una
        nueva.
      </p>
    );
  }

  if (invitation.status === 'REVOKED') {
    return <p className="text-danger text-sm">Esta invitación fue cancelada.</p>;
  }

  if (invitation.status === 'ACCEPTED') {
    return (
      <div className="gap-md flex flex-col">
        <p className="text-foreground dark:text-foreground-dark text-sm">
          Ya aceptaste esta invitación a {invitation.companyName}.
        </p>
        <Button onClick={() => (window.location.href = '/acceso/iniciar-sesion')}>
          Iniciar sesión
        </Button>
      </div>
    );
  }

  if (invitation.status === 'DECLINED' || declined) {
    return (
      <p className="text-foreground dark:text-foreground-dark text-sm">
        Rechazaste la invitación a {invitation.companyName}.
      </p>
    );
  }

  const nextParam = `/acceso/invitacion/${encodeURIComponent(token)}`;
  const currentUserEmail = session.data?.email?.toLowerCase();
  const isRightAccount = Boolean(
    currentUserEmail && currentUserEmail === invitation.email?.toLowerCase(),
  );

  const roleLabel = invitation.role ? (ROLE_LABELS[invitation.role] ?? invitation.role) : '';

  return (
    <div className="gap-md flex flex-col">
      <div className="gap-xs text-foreground dark:text-foreground-dark flex flex-col text-sm">
        <p>
          <strong>{invitation.invitedByName}</strong> te invitó a colaborar en{' '}
          <strong>{invitation.companyName}</strong>.
        </p>
        <p>Rol ofrecido: {roleLabel}</p>
      </div>

      {actionError ? <p className="text-danger text-sm">{actionError}</p> : null}

      {isRightAccount ? (
        <div className="gap-sm flex">
          <Button
            isLoading={acceptMutation.isPending}
            onClick={() => {
              setActionError(null);
              acceptMutation.mutate(token, {
                onSuccess: () => router.push('/'),
                onError: (error) =>
                  setActionError(
                    error instanceof ApiError
                      ? error.detail.message
                      : 'No se pudo aceptar la invitación.',
                  ),
              });
            }}
          >
            Aceptar
          </Button>
          <Button
            variant="secondary"
            isLoading={declineMutation.isPending}
            onClick={() => {
              setActionError(null);
              declineMutation.mutate(token, {
                onSuccess: () => setDeclined(true),
                onError: (error) =>
                  setActionError(
                    error instanceof ApiError
                      ? error.detail.message
                      : 'No se pudo rechazar la invitación.',
                  ),
              });
            }}
          >
            Rechazar
          </Button>
        </div>
      ) : currentUserEmail ? (
        <p className="text-danger text-sm">
          Esta invitación es para {invitation.email}. Cierra sesión e inicia con esa cuenta para
          continuar.
        </p>
      ) : invitation.hasAccount ? (
        <Button
          onClick={() =>
            (window.location.href = `/acceso/iniciar-sesion?next=${encodeURIComponent(nextParam)}`)
          }
        >
          Iniciar sesión para continuar
        </Button>
      ) : (
        <Button
          onClick={() =>
            (window.location.href = `/acceso/registro?email=${encodeURIComponent(invitation.email ?? '')}&next=${encodeURIComponent(nextParam)}`)
          }
        >
          Crear cuenta para continuar
        </Button>
      )}
    </div>
  );
}
