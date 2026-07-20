import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * BR-EMP-003 — solo los datos generales protegidos son editables.
 * Whitelist deliberado: `status`, `organizationId`, `version` y cualquier
 * campo de ownership nunca aparecen aqui, para que no sean asignables desde
 * el cliente (mass assignment) sin importar lo que envie la solicitud.
 */
export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  businessActivity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(13)
  rfc?: string;
}
