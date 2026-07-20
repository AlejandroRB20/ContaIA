import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * EWO-003 seccion 5.7 — sin catalogo de regimenes SAT hardcodeado
 * (CLAUDE.md regla 6): `taxRegime` es texto libre/codigo, no un `@IsEnum`
 * contra una lista de regimenes fiscales reales sin validar por el usuario.
 */
export class UpdateFiscalProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxRegime?: string;
}
