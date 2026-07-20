import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { RequestUser } from '../interfaces/request-context.interface';

/** Inyecta el usuario autenticado resuelto por `AuthenticationGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as RequestUser;
  },
);
