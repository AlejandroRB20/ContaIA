/**
 * Formas de datos para los endpoints tecnicos de salud/version de
 * docs/20_BACKEND_IMPLEMENTATION_PLAN.md. Sin dependencias de dominio
 * (ningun modulo funcional se implementa en EWO-001).
 */

export type ServiceStatus = 'ok' | 'degraded' | 'down';

export interface HealthCheckResult {
  status: ServiceStatus;
  service: string;
}

export interface HealthResponseData {
  status: ServiceStatus;
  uptimeSeconds: number;
  checks: HealthCheckResult[];
}

export interface ReadinessCheckResult extends HealthCheckResult {
  critical: boolean;
}

export interface ReadinessResponseData {
  status: ServiceStatus;
  checks: ReadinessCheckResult[];
}

export interface VersionResponseData {
  version: string;
  environment: string;
  gitCommit?: string | null;
}
