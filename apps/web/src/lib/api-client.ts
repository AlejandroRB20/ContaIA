import type { ApiSuccessResponse, HealthResponseData, VersionResponseData } from '@contaia/types';

import { apiUrl } from './http';

/**
 * Rutas minimas del backend ya fijadas en
 * docs/20_BACKEND_IMPLEMENTATION_PLAN.md (seccion 5):
 * GET /api/v1/health, GET /api/v1/version.
 */

/**
 * Consulta el estado de salud del backend. Nunca lanza por una respuesta no
 * exitosa del backend en si — un backend caido es un estado a mostrar, no
 * una excepcion no controlada del cliente (docs/17_PROTOTYPE_SPECIFICATION.md
 * seccion 14: "casos negativos", perdida de conexion).
 */
export async function fetchBackendHealth(): Promise<HealthResponseData> {
  const response = await fetch(apiUrl('/health'), { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`El backend respondio con estado ${response.status}`);
  }

  const body = (await response.json()) as ApiSuccessResponse<HealthResponseData>;
  return body.data;
}

export async function fetchBackendVersion(): Promise<VersionResponseData> {
  const response = await fetch(apiUrl('/version'), { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`El backend respondio con estado ${response.status}`);
  }

  const body = (await response.json()) as ApiSuccessResponse<VersionResponseData>;
  return body.data;
}
