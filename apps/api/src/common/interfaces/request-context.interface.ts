import type { RoleName } from '@contaia/database';

/**
 * Usuario autenticado resuelto por `AuthenticationGuard` — construido desde
 * la base de datos (no solo del JWT), para que campos como `isPlatformAdmin`
 * reflejen siempre el estado actual, no un valor cacheado en el token.
 */
export interface RequestUser {
  id: string;
  email: string;
  isPlatformAdmin: boolean;
  sessionId: string;
}

/**
 * Membership resuelta por `CompanyGuard` para el `companyId` explicito de
 * la ruta actual — nunca inferida del JWT (docs/08_API_DESIGN.md seccion 5).
 */
export interface RequestMembership {
  id: string;
  companyId: string;
  roleId: string;
  roleName: RoleName;
  isOwner: boolean;
}
