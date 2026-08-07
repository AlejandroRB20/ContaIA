/**
 * Catalogo de Permission y su asignacion por Rol (RolePermission).
 *
 * Extraido de `seed.ts` para que el catalogo sea importable en pruebas
 * unitarias sin ejecutar el seed (que se conecta a PostgreSQL). Fuente
 * normativa: docs/04_BUSINESS_RULES.md seccion 5.1/6 y D-011
 * (brain/DECISIONS.md) para las claves `cfdi.*` y `document.download` —
 * Estudiante no aparece en `ROLE_PERMISSIONS`: opera en sandbox, sin
 * permisos reales (docs/11_SECURITY_ARCHITECTURE.md seccion 9).
 */
import type { RoleName } from '../generated/client/index.js';

export const PERMISSION_CATALOG: Array<{ key: string; description: string; module: string }> = [
  {
    key: 'company.read',
    description: 'Consultar datos generales de la empresa',
    module: 'company',
  },
  {
    key: 'company.update',
    description: 'Actualizar datos generales de la empresa',
    module: 'company',
  },
  {
    key: 'company.fiscal.update',
    description: 'Actualizar el perfil fiscal y domicilio de la empresa',
    module: 'company',
  },
  {
    key: 'company.settings.update',
    description: 'Actualizar la configuracion regional de la empresa',
    module: 'company',
  },
  { key: 'journal.read', description: 'Consultar polizas contables', module: 'journal' },
  { key: 'journal.create', description: 'Crear polizas contables (borrador)', module: 'journal' },
  { key: 'journal.approve', description: 'Aprobar polizas contables', module: 'journal' },
  { key: 'inventory.create', description: 'Crear movimientos de inventario', module: 'inventory' },
  {
    key: 'inventory.update',
    description: 'Actualizar movimientos de inventario',
    module: 'inventory',
  },
  { key: 'sat.download', description: 'Descargar informacion del SAT', module: 'sat' },
  { key: 'sat.upload', description: 'Cargar informacion hacia el SAT', module: 'sat' },
  { key: 'cfdi.generate', description: 'Generar/cargar CFDI', module: 'cfdi' },
  { key: 'cfdi.cancel', description: 'Cancelar CFDI', module: 'cfdi' },
  { key: 'cfdi.read', description: 'Consultar datos extraídos del CFDI', module: 'cfdi' },
  { key: 'document.upload', description: 'Cargar documentos a la empresa', module: 'document' },
  {
    key: 'document.read',
    description: 'Consultar documentos y su estado',
    module: 'document',
  },
  {
    key: 'document.download',
    description: 'Descargar el archivo original o el XML del CFDI (binario almacenado)',
    module: 'document',
  },
  { key: 'users.invite', description: 'Invitar usuarios a la empresa', module: 'users' },
  { key: 'users.remove', description: 'Remover usuarios de la empresa', module: 'users' },
  { key: 'users.update', description: 'Actualizar el rol de un usuario', module: 'users' },
];

/**
 * docs/04_BUSINESS_RULES.md seccion 5.1 — Estudiante no aparece: opera en
 * sandbox, sin permisos reales. D-011 (2026-08-04): Auditor y Supervisor
 * reciben `cfdi.read`, estrictamente de lectura — nunca `cfdi.generate` ni
 * `cfdi.cancel`. D-011 (2026-08-05): `document.download` aprobado como
 * clave independiente para Administrador, Contador, Auxiliar, Supervisor y
 * Auditor — Estudiante no la recibe.
 */
export const ROLE_PERMISSIONS: Partial<Record<RoleName, string[]>> = {
  ADMINISTRADOR: PERMISSION_CATALOG.map((p) => p.key),
  CONTADOR: [
    'company.read',
    'journal.read',
    'journal.create',
    'journal.approve',
    'inventory.create',
    'inventory.update',
    'sat.download',
    'sat.upload',
    'cfdi.generate',
    'cfdi.cancel',
    'cfdi.read',
    'document.upload',
    'document.read',
    'document.download',
  ],
  AUXILIAR: [
    'company.read',
    'journal.read',
    'journal.create',
    'inventory.create',
    'inventory.update',
    'cfdi.generate',
    'cfdi.read',
    'document.upload',
    'document.read',
    'document.download',
  ],
  SUPERVISOR: [
    'company.read',
    'journal.read',
    'journal.approve',
    'sat.download',
    'document.read',
    'document.download',
    'cfdi.read',
  ],
  AUDITOR: [
    'company.read',
    'journal.read',
    'sat.download',
    'document.read',
    'document.download',
    'cfdi.read',
  ],
} as Partial<Record<RoleName, string[]>>;
