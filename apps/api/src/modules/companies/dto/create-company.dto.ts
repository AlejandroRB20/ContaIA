import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * BR-EMP-001/BR-EMP-003 — `name` (razon social) y `businessActivity` (giro)
 * son obligatorios al crear. `organizationId` es opcional (docs/08_API_DESIGN.md
 * API-0011: "con o sin organizationId"): si se omite, el sistema determina
 * automaticamente si agrupar bajo una Organizacion ya administrada por el
 * usuario o crear una implicita (BR-ORG-001, Workflow 4).
 */
export class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  businessActivity!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(13)
  rfc?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
