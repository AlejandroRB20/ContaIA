import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './http';
import {
  FORBIDDEN_PATH,
  SESSION_EXPIRED_PATH,
  onProtectedQueryError,
} from './session-error-handling';

import { useSessionStore } from '@/store/use-session-store';

const PUBLIC_USER = {
  id: 'user-1',
  email: 'ana@example.com',
  firstName: 'Ana',
  lastName: 'Prueba',
  memberships: [],
} as never;

function apiError(status: number): ApiError {
  return new ApiError({ code: 'X', message: 'x', correlationId: 'c', retryable: false }, status);
}

function setPathname(pathname: string): void {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, pathname, assign: vi.fn() },
    writable: true,
    configurable: true,
  });
}

describe('onProtectedQueryError', () => {
  const originalLocation = window.location;
  const clear = vi.fn();
  const queryClient = { clear } as never;

  beforeEach(() => {
    clear.mockReset();
    setPathname('/company-1/inicio');
    useSessionStore.getState().clearSession();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    useSessionStore.getState().clearSession();
  });

  it('no hace nada si nunca hubo una sesion activa (evita paginas publicas)', () => {
    onProtectedQueryError(apiError(401), queryClient);

    expect(clear).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('en 401 con sesion activa: limpia sesion, limpia cache y va a sesion expirada', () => {
    useSessionStore.getState().setSession(PUBLIC_USER, 'company-1');

    onProtectedQueryError(apiError(401), queryClient);

    expect(useSessionStore.getState().user).toBeNull();
    expect(clear).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(SESSION_EXPIRED_PATH);
  });

  it('en 403 con sesion activa: va a prohibido sin limpiar la sesion', () => {
    useSessionStore.getState().setSession(PUBLIC_USER, 'company-1');

    onProtectedQueryError(apiError(403), queryClient);

    expect(useSessionStore.getState().user).not.toBeNull();
    expect(clear).not.toHaveBeenCalled();
    expect(window.location.assign).toHaveBeenCalledWith(FORBIDDEN_PATH);
  });

  it('ignora otros codigos de estado (por ejemplo 500)', () => {
    useSessionStore.getState().setSession(PUBLIC_USER, 'company-1');

    onProtectedQueryError(apiError(500), queryClient);

    expect(clear).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('no redirige de nuevo si ya esta en la pagina de destino', () => {
    useSessionStore.getState().setSession(PUBLIC_USER, 'company-1');
    setPathname(SESSION_EXPIRED_PATH);

    onProtectedQueryError(apiError(401), queryClient);

    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
