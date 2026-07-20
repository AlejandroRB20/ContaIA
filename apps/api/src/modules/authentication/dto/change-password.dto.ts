import { IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{10,}$/;

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(10)
  @Matches(PASSWORD_PATTERN, {
    message:
      'La contraseña debe tener al menos 10 caracteres, con mayúscula, minúscula, número y símbolo.',
  })
  newPassword!: string;
}
