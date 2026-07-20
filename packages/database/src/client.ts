import { PrismaClient } from '../generated/client/index.js';

/**
 * Cliente Prisma reutilizable y compartido por todo el proceso backend.
 *
 * En desarrollo, Node puede recargar modulos en caliente y crear multiples
 * instancias de PrismaClient, agotando el pool de conexiones de PostgreSQL —
 * por eso se cachea en `globalThis` en entornos no productivos (patron
 * estandar recomendado por Prisma).
 */
declare global {
  var __contaiaPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma: PrismaClient = globalThis.__contaiaPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__contaiaPrisma = prisma;
}

/**
 * Desconexion segura del cliente Prisma, usada durante el apagado
 * controlado del backend (docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 1:
 * "cierre seguro de conexiones").
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export type { PrismaClient } from '../generated/client/index.js';
