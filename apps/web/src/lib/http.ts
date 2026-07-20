import type { ApiErrorDetail, ApiErrorResponse, ApiSuccessResponse } from '@contaia/types';

import { getClientEnv } from './env';

const CSRF_TOKEN_COOKIE = 'contaia_csrf_token';
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export function apiUrl(path: string): string {
  const { NEXT_PUBLIC_API_URL } = getClientEnv();
  return `${NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/v1${path}`;
}

export class ApiError extends Error {
  constructor(public readonly detail: ApiErrorDetail) {
    super(detail.message);
    this.name = 'ApiError';
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  const value = match?.[1];
  return value ? decodeURIComponent(value) : undefined;
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Cliente HTTP autenticado — cookies HttpOnly de sesion enviadas via
 * `credentials: 'include'` (nunca localStorage,
 * docs/19_FRONTEND_IMPLEMENTATION_PLAN.md seccion 10); adjunta el
 * encabezado CSRF de doble cookie en toda mutacion.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { ...options.headers };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = readCookie(CSRF_TOKEN_COOKIE);
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = json as ApiErrorResponse | null;
    if (errorBody?.error) {
      throw new ApiError(errorBody.error);
    }
    throw new ApiError({
      code: 'INTERNAL_ERROR',
      message: `El servidor respondió con estado ${response.status}.`,
      correlationId: '',
      retryable: true,
    });
  }

  return (json as ApiSuccessResponse<T>).data;
}
