import { prisma } from '@contaia/database';
import type { Prisma } from '@contaia/database';
import { Injectable } from '@nestjs/common';

export interface AuditLogEntry {
  actorUserId?: string | null;
  companyId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  result: 'SUCCESS' | 'FAILURE';
  beforeState?: Prisma.InputJsonValue;
  afterState?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  reason?: string | null;
  correlationId: string;
}

/**
 * Repositorio append-only del Registro de Trazabilidad (BR-TRZ-002) —
 * deliberadamente no expone ningun metodo de actualizacion ni borrado.
 */
@Injectable()
export class AuditRepository {
  async append(entry: AuditLogEntry): Promise<void> {
    await prisma.auditLog.create({ data: entry });
  }
}
