import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_METADATA_KEY = 'contaia:permissions';

/** Exige que el Rol de la Membership resuelta tenga todas las claves indicadas. */
export const Permissions = (...permissionKeys: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_METADATA_KEY, permissionKeys);
