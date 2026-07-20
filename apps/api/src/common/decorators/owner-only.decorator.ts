import { applyDecorators, UseGuards } from '@nestjs/common';

import { OwnershipGuard } from '../guards/ownership.guard';

/** Aplica `OwnershipGuard` — exige que la Membership resuelta sea propietaria. */
export const OwnerOnly = (): MethodDecorator & ClassDecorator =>
  applyDecorators(UseGuards(OwnershipGuard));
