import { DocumentFileType } from '@contaia/database';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Body de API-0023 (docs/08_API_DESIGN.md seccion 9.5) — metadatos minimos
 * de carga (BR-DOC-002). Deliberadamente NO incluye `companyId`,
 * `uploadedByUserId`, `storageReference`, `status`, `sizeBytes`,
 * `checksumSha256` ni `rejectionReason`: todos se resuelven en el servidor
 * (`DocumentsController`/`DocumentsService`), nunca desde el cliente
 * (BR-GLB-001). `ValidationPipe` global (`forbidNonWhitelisted: true`)
 * rechaza cualquier campo adicional con 400 antes de llegar al controlador.
 *
 * Sin whitelist de MIME types ni limite de tamaño: ninguno de los dos esta
 * definido formalmente todavia (docs/08_API_DESIGN.md seccion 14.9,
 * docs/11_SECURITY_ARCHITECTURE.md seccion 16 — "pendiente de validacion").
 * `fileType` se recibe explicito del cliente, nunca inferido de `mimeType`.
 */
export class UploadDocumentDto {
  @ApiProperty({
    description:
      'Nombre original del archivo tal como lo ve el usuario. Nunca se usa para construir la key de almacenamiento.',
    maxLength: 255,
    example: 'factura-enero.xml',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalFilename!: string;

  @ApiProperty({
    description: 'Tipo MIME declarado por el cliente.',
    maxLength: 150,
    example: 'application/xml',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  mimeType!: string;

  @ApiProperty({ enum: DocumentFileType, example: DocumentFileType.XML })
  @IsEnum(DocumentFileType)
  fileType!: DocumentFileType;
}
