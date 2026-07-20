import type { RoleName } from '@contaia/database';
import { SetMetadata } from '@nestjs/common';

export const ROLES_METADATA_KEY = 'contaia:roles';

/** Exige que la Membership resuelta tenga uno de los roles indicados. */
export const Roles = (...roles: RoleName[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_METADATA_KEY, roles);
