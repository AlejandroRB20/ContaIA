import { DocumentFileType, DocumentStatus } from '@contaia/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Forma segura de un Documento para API-0024 (item de listado) y API-0025
 * (consulta individual). NUNCA incluye `storageReference` (object key),
 * `checksumSha256`, `uploadedByUserId` (sin aprobacion explicita para
 * respuesta publica en este bloque), ni ningun dato de Membership/permisos.
 *
 * `rejectionReason` SI se expone: docs/08_API_DESIGN.md seccion 14.7 —
 * "un Documento REJECTED conserva el motivo" (BR-ERR-001) — es informacion
 * que el usuario necesita ver, no un detalle interno.
 */
export class DocumentDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ maxLength: 255 })
  originalFilename!: string;

  @ApiProperty({ enum: DocumentFileType })
  fileType!: DocumentFileType;

  @ApiProperty({ maxLength: 150 })
  mimeType!: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  sizeBytes!: number | null;

  @ApiProperty({ enum: DocumentStatus })
  status!: DocumentStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  rejectionReason!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
