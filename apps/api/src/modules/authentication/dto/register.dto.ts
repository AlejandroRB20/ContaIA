import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{10,}$/;

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(10)
  @Matches(PASSWORD_PATTERN, {
    message:
      'La contraseña debe tener al menos 10 caracteres, con mayúscula, minúscula, número y símbolo.',
  })
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
