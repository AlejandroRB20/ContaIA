import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';

import { DocumentsAuthorizationService } from './documents-authorization.service';
import { DocumentsController } from './documents.controller';
import { DocumentsRepository } from './documents.repository';
import { DocumentsService } from './documents.service';

/**
 * Bloques A y B de EWO-005. Importa `StorageModule` para inyectar
 * `STORAGE_ADAPTER` en `DocumentsService` — no depende de CfdiModule,
 * XmlProcessingModule, JobsModule ni BullMQ (ninguno existe todavia).
 * `DocumentsAuthorizationService` inyecta `MembershipsRepository`/
 * `RolesRepository` — ambos globales via `CommonModule`, sin necesidad de
 * importar `RolesPermissionsModule` aqui.
 */
@Module({
  imports: [StorageModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsRepository, DocumentsAuthorizationService],
})
export class DocumentsModule {}
