import { RoleName } from '@contaia/database';
import { IsEnum } from 'class-validator';

export class UpdateMembershipRoleDto {
  @IsEnum(RoleName)
  role!: RoleName;
}
