import type { RequestMembership, RequestUser } from '../interfaces/request-context.interface';

// Aumenta el tipo Request de Express con el identificador de correlacion
// que docs/08_API_DESIGN.md (seccion 4) exige propagar en toda solicitud, y
// con el usuario/membership resueltos por AuthenticationGuard/CompanyGuard
// (EWO-002).
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      user?: RequestUser;
      membership?: RequestMembership;
    }
  }
}

export {};
