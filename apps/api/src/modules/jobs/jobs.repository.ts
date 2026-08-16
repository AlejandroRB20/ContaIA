import { prisma, Prisma, JobStatus, type Job, type JobType } from '@contaia/database';
import { Injectable } from '@nestjs/common';

import { TransicionNoConfirmadaError } from '../cfdi/cfdi.errors';

/**
 * Estados desde los que un Job puede transicionar via `updateMany` (D-007,
 * Addendum AD-10.1.2/§7): `QUEUED` (recien encolado, el worker aun no lo
 * reclamo) y `PROCESSING` (reclamado, reintento en curso). `COMPLETED`,
 * `FAILED` y `CANCELLED` son terminales — nunca origen de una nueva
 * transicion, por eso no aparecen aqui.
 */
const ACTIVE_JOB_STATUSES: JobStatus[] = [JobStatus.QUEUED, JobStatus.PROCESSING];

export interface CreateQueuedJobData {
  id: string;
  companyId: string;
  documentId: string;
  type: JobType;
}

export interface JobSummary {
  id: string;
  companyId: string;
  documentId: string;
  type: JobType;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
}

const JOB_SUMMARY_SELECT = {
  id: true,
  companyId: true,
  documentId: true,
  type: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Bloque D de EWO-005. `id` en `CreateQueuedJobData` es SIEMPRE el UUIDv5
 * deterministico de `job-id.util.ts` — nunca un id aleatorio — es lo que
 * hace posible garantizar "a lo sumo un Job logico por (companyId,
 * documentId, type)" sin un indice unico adicional en el schema (la propia
 * PK ya lo es). No expone ninguna busqueda por `documentId` sola: el
 * llamante siempre conoce el id determinista de antemano y no necesita
 * "buscar" el Job, solo crearlo o recuperarlo por ese id.
 */
@Injectable()
export class JobsRepository {
  /**
   * Crea el Job en estado QUEUED; si la clave primaria (el id
   * deterministico) ya existe — porque otra solicitud concurrente gano la
   * carrera, o porque es una confirmacion repetida — recupera el Job
   * existente en vez de fallar. Patron "create-then-catch", nunca
   * "find-first-then-create": la unicidad la garantiza Postgres al
   * serializar el INSERT, no una comprobacion previa en la aplicacion (que
   * dejaria una ventana de carrera). `existing` solo puede ser `null` si el
   * Job fue borrado entre el INSERT fallido y el SELECT — este sistema
   * nunca borra Jobs, asi que ese caso re-lanza el error original en vez de
   * inventar un estado que no puede ocurrir en la practica.
   *
   * `companyId` en el `where` del `findUnique` de recuperacion (`E5-S2-T08`,
   * BR-GLB-001) es un filtro explicito de defensa en profundidad: el `id`
   * deterministico ya es criptograficamente imposible de colisionar entre
   * Empresas distintas (`buildDeterministicJobId` deriva el UUIDv5 de
   * `type + companyId + documentId`, `job-id.util.ts`), pero el criterio de
   * BR-GLB-001 exige el filtro explicito en toda consulta, no opcional, sin
   * depender implicitamente de una garantia criptografica externa a la
   * consulta misma.
   */
  async findOrCreateQueued(data: CreateQueuedJobData): Promise<JobSummary> {
    try {
      return await prisma.job.create({
        data: {
          id: data.id,
          companyId: data.companyId,
          documentId: data.documentId,
          type: data.type,
          status: JobStatus.QUEUED,
        },
        select: JOB_SUMMARY_SELECT,
      });
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        const existing = await prisma.job.findUnique({
          where: { id: data.id, companyId: data.companyId },
          select: JOB_SUMMARY_SELECT,
        });
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  /**
   * `E5-S2-T05`. Tenant-safe por construccion: `companyId` es obligatorio
   * en el `where`, nunca opcional ni agregado despues — a diferencia de
   * `DocumentsRepository.findById` (que deliberadamente omite `companyId`
   * porque su llamante aun no conoce la Empresa), este metodo siempre se
   * usa cuando la Empresa ya es conocida y confiable, asi que un Job de
   * otra Empresa debe ser indistinguible de "no existe". `findFirst` en vez
   * de `findUnique`: `Job` no tiene `@@unique([id, companyId])` (a
   * diferencia de `Cfdi`, que si lo agrego para sus FKs compuestas) —
   * `id` como PK ya garantiza a lo sumo una fila, `companyId` en el mismo
   * `where` solo la filtra, nunca la desambigua.
   */
  async findById(id: string, companyId: string): Promise<Job | null> {
    return prisma.job.findFirst({ where: { id, companyId } });
  }

  /**
   * `E5-S2-T05`. Reclamo inicial del worker (Addendum §7, paso 4) — se
   * ejecuta fuera de cualquier transaccion, antes de descargar o procesar
   * nada. A diferencia de `markAsCompleted`, ni D-007 ni el Addendum
   * exigen `count === 1` aqui: ningun criterio ni gate numerado lo
   * establece (solo las dos transiciones terminales de cierre —
   * `Document PROCESSING→PROCESSED` y `Job→COMPLETED` — lo exigen,
   * Addendum §9.5/AD-10.1.2). Exigirlo de todos modos seria inventar una
   * politica ausente. Se retorna el `count` real sin interpretarlo, para
   * que la llamante decida — nunca se lanza ni se retorna un booleano que
   * oculte el valor real.
   */
  async markAsProcessing(id: string, companyId: string): Promise<number> {
    const result = await prisma.job.updateMany({
      where: { id, companyId, status: { in: ACTIVE_JOB_STATUSES } },
      data: { status: JobStatus.PROCESSING },
    });

    return result.count;
  }

  /**
   * `E5-S2-T05`. Cierre exitoso del Job, dentro de la misma Transaccion A
   * unica de `E5-S2-T06` (D-007, Addendum AD-10.1.2) que cierra
   * `Document PROCESSING→PROCESSED` — recibe el `tx` externo explicitamente,
   * igual que `DocumentsRepository.markAsProcessed`, nunca el cliente
   * global ni una transaccion propia. `count !== 1` (nunca `count === 0`
   * como unica guarda) fuerza `TransicionNoConfirmadaError('job', count)`
   * sin retornar ni continuar — es exactamente la comprobacion que faltaba
   * en el diseño original de este Addendum (hallazgo CRITICO: "el cierre
   * `Job → COMPLETED` usaba `updateMany` sin comprobar `count`", corregido
   * por D-007 Regla 3/4, criterio 64, gates G-07 a G-12).
   */
  async markAsCompleted(
    tx: Prisma.TransactionClient,
    id: string,
    companyId: string,
    result: Prisma.InputJsonValue,
  ): Promise<void> {
    const updateResult = await tx.job.updateMany({
      where: { id, companyId, status: { in: ACTIVE_JOB_STATUSES } },
      data: { status: JobStatus.COMPLETED, result },
    });

    if (updateResult.count !== 1) {
      throw new TransicionNoConfirmadaError('job', updateResult.count);
    }
  }

  /**
   * `E5-S2-T05`. A diferencia de `markAsCompleted`, este metodo NUNCA lanza
   * por `count !== 1` — el Addendum (AD-4.2) documenta explicitamente que
   * la Transaccion C (`markAsRejected` + `markAsFailed`) debe ser idempotente
   * ante doble ejecucion: el processor puede cerrarla antes de lanzar
   * `UnrecoverableError`, y el handler `failed` terminal la vuelve a
   * ejecutar despues como respaldo (tres capas de garantia, AD-4.3) — la
   * segunda ejecucion encuentra el Job ya `FAILED` (fuera de
   * `ACTIVE_JOB_STATUSES`) y su `updateMany` no afecta ninguna fila **por
   * diseño**, un no-op valido, no un defecto. Lanzar aqui convertiria ese
   * no-op documentado en un error espurio. Se retorna el `count` real, sin
   * interpretarlo, para que la llamante lo registre si lo necesita.
   */
  async markAsFailed(id: string, companyId: string, error: string): Promise<number> {
    const result = await prisma.job.updateMany({
      where: { id, companyId, status: { in: ACTIVE_JOB_STATUSES } },
      data: { status: JobStatus.FAILED, error },
    });

    return result.count;
  }
}
