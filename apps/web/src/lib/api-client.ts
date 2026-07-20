import type { ApiSuccessResponse, HealthResponseData } from '@contaia/types';

import { apiUrl } from './http';

/**
 * Cliente de la ruta de salud consumida por la pantalla técnica de estado.
 * El contrato de las rutas técnicas vive en
 * docs/20_BACKEND_IMPLEMENTATION_PLAN.md (seccion 5).
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
