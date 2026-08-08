/**
 * Pruebas de la validación de archivos del dropzone (Fase 6 / Fase 8).
 * Solo pruebas de lógica pura — sin renderizado de DOM.
 * Mocks limitados a pruebas visuales (nunca en producción).
 */
import { describe, expect, it } from 'vitest';

import { validateFile } from './file-dropzone';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeFile(name: string, size: number, type = ''): File {
  // File constructor: (parts, filename, options)
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

const MB25 = 25 * 1024 * 1024;

// ──────────────────────────────────────────────────────────────────────────────
// validateFile
// ──────────────────────────────────────────────────────────────────────────────

describe('validateFile', () => {
  it('rechaza archivos vacíos', () => {
    const result = validateFile(makeFile('factura.xml', 0, 'application/xml'));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/vacío/i);
    }
  });

  it('rechaza archivos mayores de 25 MB', () => {
    const result = validateFile(makeFile('grande.pdf', MB25 + 1, 'application/pdf'));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/25 MB/i);
    }
  });

  it('acepta archivo XML por MIME type (application/xml)', () => {
    const result = validateFile(makeFile('factura.xml', 1024, 'application/xml'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.fileType).toBe('XML');
    }
  });

  it('acepta archivo XML por MIME type (text/xml)', () => {
    const result = validateFile(makeFile('cfdi.xml', 1024, 'text/xml'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.fileType).toBe('XML');
    }
  });

  it('detecta XML por extensión cuando el MIME type está vacío', () => {
    const result = validateFile(makeFile('cfdi.xml', 1024, ''));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.fileType).toBe('XML');
    }
  });

  it('acepta archivo PDF por MIME type', () => {
    const result = validateFile(makeFile('recibo.pdf', 2048, 'application/pdf'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.fileType).toBe('PDF');
    }
  });

  it('detecta PDF por extensión cuando el MIME type está vacío', () => {
    const result = validateFile(makeFile('recibo.pdf', 2048, ''));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.fileType).toBe('PDF');
    }
  });

  it('clasifica extensiones desconocidas como OTHER', () => {
    const result = validateFile(makeFile('datos.csv', 512, 'text/csv'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.fileType).toBe('OTHER');
    }
  });

  it('acepta exactamente 25 MB (límite inclusive)', () => {
    const result = validateFile(makeFile('limite.pdf', MB25, 'application/pdf'));
    expect(result.success).toBe(true);
  });
});
