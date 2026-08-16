import { DocumentStatus } from '@contaia/database';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Respuesta de API-0023 (iniciar carga). Expone unicamente lo necesario
 * para que el cliente complete la carga directa al almacenamiento —
 * NUNCA `storageReference` (object key), ni datos de configuracion de
 * almacenamiento (bucket, endpoint, credenciales), ni relaciones de
 * Prisma (Membership, Company completo).
 */
export class DocumentResponseDto {
  @ApiProperty({ format: 'uuid' })
  documentId!: string;

  @ApiProperty({
    description:
      'URL prefirmada de un solo uso para subir el archivo directamente al almacenamiento de objetos.',
  })
  uploadUrl!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.PENDING_UPLOAD })
  status!: DocumentStatus;
}
