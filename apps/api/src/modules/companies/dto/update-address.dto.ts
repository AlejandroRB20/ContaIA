import { IsOptional, IsString, MaxLength } from 'class-validator';

/** EWO-003 seccion 5.7 — domicilio fiscal. Todos opcionales (PATCH parcial). */
export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  exteriorNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  interiorNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  municipality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}
