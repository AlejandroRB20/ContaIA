import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { RequestMembership } from '../interfaces/request-context.interface';

/** Inyecta la Membership resuelta por `CompanyGuard` para la empresa de la ruta. */
export const Company = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestMembership => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.membership as RequestMembership;
  },
);
