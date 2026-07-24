import { prisma, Prisma, JobStatus, type JobType } from '@contaia/database';
import { Injectable } from '@nestjs/common';

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
          where: { id: data.id },
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
}
