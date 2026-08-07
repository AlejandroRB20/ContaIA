import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { RoleName } from '../generated/client/index.js';
import { PERMISSION_CATALOG, ROLE_PERMISSIONS } from '../prisma/permissions-catalog.js';

/**
 * D-011 (brain/DECISIONS.md) — EWO-SEC-NAV-001 T03: cfdi.read para Auditor
 * y Supervisor, estrictamente de lectura, y document.download como clave
 * independiente de descarga de binario. Prueba el catalogo sembrado
 * directamente (sin PostgreSQL), no el guard HTTP — ninguna de las dos
 * claves esta exigida todavia por un endpoint (API-0026/0027/0028 sin
 * controlador).
 */
describe('Catalogo de permisos CFDI (D-011)', () => {
  it('concede cfdi.read a Auditor', () => {
    expect(ROLE_PERMISSIONS[RoleName.AUDITOR]).toContain('cfdi.read');
  });

  it('concede cfdi.read a Supervisor', () => {
    expect(ROLE_PERMISSIONS[RoleName.SUPERVISOR]).toContain('cfdi.read');
  });

  it('conserva cfdi.read en Contador y Auxiliar', () => {
    expect(ROLE_PERMISSIONS[RoleName.CONTADOR]).toContain('cfdi.read');
    expect(ROLE_PERMISSIONS[RoleName.AUXILIAR]).toContain('cfdi.read');
  });

  it('no concede cfdi.read a Estudiante (sandbox, sin permisos reales)', () => {
    expect(ROLE_PERMISSIONS[RoleName.ESTUDIANTE]).toBeUndefined();
  });

  it('Auditor y Supervisor reciben cfdi.read en modo estrictamente lectura, nunca cfdi.generate/cfdi.cancel', () => {
    expect(ROLE_PERMISSIONS[RoleName.AUDITOR]).not.toContain('cfdi.generate');
    expect(ROLE_PERMISSIONS[RoleName.AUDITOR]).not.toContain('cfdi.cancel');
    expect(ROLE_PERMISSIONS[RoleName.SUPERVISOR]).not.toContain('cfdi.generate');
    expect(ROLE_PERMISSIONS[RoleName.SUPERVISOR]).not.toContain('cfdi.cancel');
  });

  it('los unicos roles con permisos son los seis roles oficiales — isPlatformAdmin no es un rol empresarial', () => {
    const officialRoles = Object.values(RoleName);
    const rolesWithPermissions = Object.keys(ROLE_PERMISSIONS);
    expect(rolesWithPermissions.every((role) => officialRoles.includes(role as RoleName))).toBe(
      true,
    );
  });

  it('no existen permisos de escritura/eliminacion de CFDI (BR-INT-002: el agregado es inmutable)', () => {
    const cfdiKeys = PERMISSION_CATALOG.filter((p) => p.module === 'cfdi').map((p) => p.key);
    expect(cfdiKeys.sort()).toEqual(['cfdi.cancel', 'cfdi.generate', 'cfdi.read']);
  });

  it('document.download existe en el catalogo — D-011 (2026-08-05): decision de producto aprobada en T03', () => {
    expect(PERMISSION_CATALOG.some((p) => p.key === 'document.download')).toBe(true);
  });

  it('document.download se concede a Administrador, Contador, Auxiliar, Supervisor y Auditor', () => {
    expect(ROLE_PERMISSIONS[RoleName.ADMINISTRADOR]).toContain('document.download');
    expect(ROLE_PERMISSIONS[RoleName.CONTADOR]).toContain('document.download');
    expect(ROLE_PERMISSIONS[RoleName.AUXILIAR]).toContain('document.download');
    expect(ROLE_PERMISSIONS[RoleName.SUPERVISOR]).toContain('document.download');
    expect(ROLE_PERMISSIONS[RoleName.AUDITOR]).toContain('document.download');
  });

  it('document.download no se concede a Estudiante (sin entrada en ROLE_PERMISSIONS)', () => {
    expect(ROLE_PERMISSIONS[RoleName.ESTUDIANTE]).toBeUndefined();
  });

  it('document.read y document.download son permisos distintos', () => {
    const documentKeys = PERMISSION_CATALOG.filter((p) => p.module === 'document').map(
      (p) => p.key,
    );
    expect(documentKeys).toContain('document.read');
    expect(documentKeys).toContain('document.download');
    expect(
      documentKeys.filter((k) => k === 'document.read' || k === 'document.download'),
    ).toHaveLength(2);
  });

  it('cfdi.read y document.download son claves de permiso independientes (cfdi.read no implica descarga de binario)', () => {
    const cfdiRead = PERMISSION_CATALOG.find((p) => p.key === 'cfdi.read');
    const documentDownload = PERMISSION_CATALOG.find((p) => p.key === 'document.download');
    expect(cfdiRead).toBeDefined();
    expect(documentDownload).toBeDefined();
    expect(cfdiRead?.module).toBe('cfdi');
    expect(documentDownload?.module).toBe('document');
  });

  it('no existen claves de permiso duplicadas en el catalogo', () => {
    const keys = PERMISSION_CATALOG.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('ningun rol puede descargar sin poder consultar: document.download implica document.read', () => {
    const rolesConDescarga = Object.entries(ROLE_PERMISSIONS)
      .filter(([, keys]) => keys?.includes('document.download'))
      .map(([role]) => role);

    expect(rolesConDescarga.length).toBeGreaterThan(0);
    for (const role of rolesConDescarga) {
      expect(ROLE_PERMISSIONS[role as RoleName]).toContain('document.read');
    }
  });
});

/**
 * Sincronizacion documentacion <-> catalogo (EWO-SEC-NAV-001 T03, cierre
 * 2026-08-06). `docs/04_BUSINESS_RULES.md` BR-PERM-004 es la matriz canonica
 * por accion; este bloque la lee del documento real y la compara contra el
 * catalogo sembrado, para que una divergencia futura falle en pruebas en vez
 * de sobrevivir hasta una auditoria manual.
 *
 * Limite conocido: solo cubre las filas de BR-PERM-004 cuya clave de permiso
 * aparece entre acentos graves con la forma `modulo.accion`. Las filas sin
 * clave (operaciones inexistentes por diseño, BR-INT-002) y las que apuntan a
 * endpoints (`API-00XX`) quedan fuera por construccion. Si la tabla cambia de
 * formato, la asercion de cobertura minima falla en lugar de pasar en vacio.
 */
describe('BR-PERM-004 (docs/04) coincide con el catalogo sembrado', () => {
  const ROLES_POR_ETIQUETA: Record<string, RoleName> = {
    Administrador: RoleName.ADMINISTRADOR,
    Contador: RoleName.CONTADOR,
    Auxiliar: RoleName.AUXILIAR,
    Supervisor: RoleName.SUPERVISOR,
    Auditor: RoleName.AUDITOR,
    Estudiante: RoleName.ESTUDIANTE,
  };

  const documento = readFileSync(
    fileURLToPath(new URL('../../../docs/04_BUSINESS_RULES.md', import.meta.url)),
    'utf8',
  );

  const seccion = documento.slice(documento.indexOf('#### BR-PERM-004'));
  const filas = seccion
    .slice(0, seccion.indexOf('\n## '))
    .split('\n')
    .filter((linea) => linea.startsWith('|'))
    .map((linea) => linea.split('|').map((celda) => celda.trim()))
    .filter((celdas) => celdas.length >= 6)
    .map((celdas) => ({
      recurso: celdas[1],
      accion: celdas[2],
      clave: celdas[3].replace(/`/g, ''),
      roles: celdas[4],
    }))
    .filter((fila) => /^[a-z]+\.[a-z]+$/.test(fila.clave));

  it('la tabla se pudo leer y contiene todas las claves de Documento/CFDI', () => {
    expect(seccion.startsWith('#### BR-PERM-004')).toBe(true);
    expect([...new Set(filas.map((f) => f.clave))].sort()).toEqual([
      'cfdi.cancel',
      'cfdi.generate',
      'cfdi.read',
      'document.download',
      'document.read',
      'document.upload',
    ]);
  });

  it.each(filas.map((fila) => [`${fila.recurso} — ${fila.accion} (${fila.clave})`, fila] as const))(
    '%s: los roles documentados son exactamente los del catalogo',
    (_titulo, fila) => {
      const rolesDocumentados = fila.roles
        .split(',')
        .map((etiqueta) => etiqueta.trim())
        .map((etiqueta) => ROLES_POR_ETIQUETA[etiqueta])
        .filter((rol): rol is RoleName => rol !== undefined)
        .sort();

      const rolesDelCatalogo = Object.entries(ROLE_PERMISSIONS)
        .filter(([, keys]) => keys?.includes(fila.clave))
        .map(([rol]) => rol as RoleName)
        .sort();

      expect(rolesDocumentados.length).toBeGreaterThan(0);
      expect(rolesDelCatalogo).toEqual(rolesDocumentados);
    },
  );
});
