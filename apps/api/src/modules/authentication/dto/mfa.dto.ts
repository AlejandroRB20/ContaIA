import { IsString, Length, MinLength } from 'class-validator';

export class MfaChallengeVerifyDto {
  @IsString()
  @MinLength(1)
  mfaChallengeToken!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class MfaEnableDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class MfaDisableDto {
  @IsString()
  @MinLength(1)
  password!: string;
}

export class MfaRecoveryCodeLoginDto {
  @IsString()
  @MinLength(1)
  mfaChallengeToken!: string;

  @IsString()
  @MinLength(1)
  recoveryCode!: string;
}

export class MfaEnrollmentSetupDto {
  @IsString()
  @MinLength(1)
  mfaChallengeToken!: string;
}

export class MfaEnrollmentEnableDto {
  @IsString()
  @MinLength(1)
  mfaChallengeToken!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
