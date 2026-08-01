import { Module } from '@nestjs/common';

/**
 * E5-S3-T01. Límite modular del parser CFDI (Bloque E, Sprint 3).
 *
 * Responsabilidad: validación y extracción XML — sin Prisma, sin BullMQ,
 * sin JobsModule, sin DocumentsModule, sin StorageModule. El Buffer XML
 * es entregado por el Worker (Sprint 4); los providers concretos
 * (XmlValidationService, CfdiExtractorService, etc.) se agregan en T03–T11.
 */
@Module({
  imports: [],
  providers: [],
  exports: [],
})
export class XmlProcessingModule {}
