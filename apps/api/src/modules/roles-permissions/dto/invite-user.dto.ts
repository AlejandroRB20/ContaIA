import { RoleName } from '@contaia/database';
import { IsEmail, IsEnum } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsEnum(RoleName)
  role!: RoleName;
}
