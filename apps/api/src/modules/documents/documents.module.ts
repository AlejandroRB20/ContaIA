import { Module } from '@nestjs/common';

import { JobsModule } from '../jobs/jobs.module';
import { StorageModule } from '../storage/storage.module';

import { DocumentsAuthorizationService } from './documents-authorization.service';
import { DocumentsController } from './documents.controller';
import { DocumentsRepository } from './documents.repository';
import { DocumentsService } from './documents.service';

/**
 * Bloques A, B, C y D de EWO-005. Importa `StorageModule` para inyectar
 * `STORAGE_ADAPTER`, y `JobsModule` (Bloque D) para inyectar `JobsService`
 * — ambos en `DocumentsService`. No depende de CfdiModule ni
 * XmlProcessingModule (ninguno existe todavia). `DocumentsAuthorizationService`
 * inyecta `MembershipsRepository`/`RolesRepository` — ambos globales via
 * `CommonModule`, sin necesidad de importar `RolesPermissionsModule` aqui.
 */
@Module({
  imports: [StorageModule, JobsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsRepository, DocumentsAuthorizationService],
})
export class DocumentsModule {}
