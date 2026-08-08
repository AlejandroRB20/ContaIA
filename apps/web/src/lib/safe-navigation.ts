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

/**
 * Punto único de decisión para el destino tras elegir una Empresa en el
 * selector (docs/engineering/EWO-SEC-NAV-001_TENANT_ISOLATION_PLAN.md T02).
 * `next` solo se conserva si es interno, pertenece a `chosenCompanyId` y el
 * usuario tiene una Membership activa para esa empresa; en cualquier otro
 * caso aterriza en el inicio de la empresa elegida.
 */
export function resolveDestination(
  next: string | null,
  chosenCompanyId: string,
  memberships: Array<{ companyId: string }>,
): string {
  const fallback = `/${chosenCompanyId}/inicio`;
  const path = safeInternalPath(next, '');
  if (!path) return fallback;

  const [firstSegment] = path.replace(/^\//, '').split('/');
  if (firstSegment !== chosenCompanyId) return fallback;
  if (!memberships.some((membership) => membership.companyId === chosenCompanyId)) return fallback;

  return path;
}
