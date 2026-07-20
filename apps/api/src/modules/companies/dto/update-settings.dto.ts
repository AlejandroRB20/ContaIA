import { IsOptional, IsString, MaxLength } from 'class-validator';

/** EWO-003 seccion 5.8 — configuracion regional/operativa. Todos opcionales (PATCH parcial). */
export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timeZone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  baseCurrency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}
