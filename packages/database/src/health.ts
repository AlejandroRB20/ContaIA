import { prisma } from './client';

/**
 * Verifica conectividad real con PostgreSQL mediante una consulta trivial.
 * Usado por el endpoint de readiness de apps/api
 * (docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 5: "endpoint de salud
 * debe verificar como minimo... conectividad con PostgreSQL").
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
