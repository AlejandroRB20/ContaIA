/**
 * Claims del access token JWT (EWO-002, decision de arquitectura: alineado
 * con docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 2/18) — deliberadamente
 * minimo. `activeCompanyId`/`membershipId` son solo un hint de UX para que
 * el frontend muestre la ultima empresa activa sin una llamada adicional;
 * ninguna decision de autorizacion confia en ellos — CompanyGuard siempre
 * resuelve la Membership de nuevo desde la base de datos usando el
 * `companyId` explicito de la ruta (docs/08_API_DESIGN.md seccion 5).
 */
export interface AccessTokenPayload {
  /** userId */
  sub: string;
  /** sessionId */
  sid: string;
  activeCompanyId?: string;
  membershipId?: string;
}
