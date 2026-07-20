/**
 * Conserva la navegacion posterior a autenticacion dentro de la aplicacion.
 * Los valores de `next` provienen de la URL y no deben enviarse directamente
 * a `router.push`, que admite destinos externos.
 */
export function safeInternalPath(destination: string | null, fallback = '/'): string {
  if (
    !destination ||
    !destination.startsWith('/') ||
    destination.startsWith('//') ||
    destination.startsWith('/\\')
  ) {
    return fallback;
  }

  return destination;
}
