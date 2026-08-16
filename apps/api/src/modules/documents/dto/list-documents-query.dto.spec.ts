import { DocumentFileType, DocumentStatus } from '@contaia/database';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ListDocumentsQueryDto } from './list-documents-query.dto';

// Mismas opciones que el ValidationPipe global (main.ts: whitelist,
// forbidNonWhitelisted, transform) — se replican explicitamente aqui para
// probar el DTO de forma aislada, sin bootstrap de Nest.
async function validateQuery(plain: Record<string, unknown>) {
  const instance = plainToInstance(ListDocumentsQueryDto, plain);
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

describe('ListDocumentsQueryDto', () => {
  describe('seguridad — campos no declarados', () => {
    it('rechaza companyId como campo no whitelisteado', async () => {
      const errors = await validateQuery({ companyId: 'inyectado', page: 1, pageSize: 20 });

      expect(errors.some((e) => e.property === 'companyId')).toBe(true);
    });

    it('rechaza filtros no autorizados (ej. filename, uploadedByUserId)', async () => {
      const errors = await validateQuery({ filename: 'factura.xml', uploadedByUserId: 'x' });

      const rejectedProps = errors.map((e) => e.property);
      expect(rejectedProps).toContain('filename');
      expect(rejectedProps).toContain('uploadedByUserId');
    });
  });

  describe('paginacion', () => {
    it('acepta page y pageSize por defecto cuando no se envian', async () => {
      const errors = await validateQuery({});

      expect(errors).toHaveLength(0);
    });

    it('los valores por defecto son page=1, pageSize=20', () => {
      const instance = plainToInstance(ListDocumentsQueryDto, {});

      expect(instance.page).toBe(1);
      expect(instance.pageSize).toBe(20);
    });

    it('rechaza page=0 (minimo 1)', async () => {
      const errors = await validateQuery({ page: 0 });

      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('rechaza page negativo', async () => {
      const errors = await validateQuery({ page: -1 });

      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('rechaza page no entero', async () => {
      const errors = await validateQuery({ page: 1.5 });

      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('rechaza page con un valor no numerico (string arbitrario)', async () => {
      const errors = await validateQuery({ page: 'abc' });

      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('rechaza pageSize no entero', async () => {
      const errors = await validateQuery({ pageSize: 1.5 });

      expect(errors.some((e) => e.property === 'pageSize')).toBe(true);
    });

    it('rechaza pageSize=0 (minimo 1)', async () => {
      const errors = await validateQuery({ pageSize: 0 });

      expect(errors.some((e) => e.property === 'pageSize')).toBe(true);
    });

    // Limite maximo de pageSize pendiente de definicion normativa
    // (docs/08_API_DESIGN.md seccion 12: "pendiente de validacion";
    // docs/11_SECURITY_ARCHITECTURE.md no lo define). No se inventa una
    // cifra: un pageSize grande NO debe rechazarse por una regla que no
    // esta aprobada en ninguna fuente normativa.
    it('NO rechaza un pageSize grande (sin maximo aprobado todavia)', async () => {
      const errors = await validateQuery({ pageSize: 5000 });

      expect(errors).toHaveLength(0);
    });

    it('convierte page/pageSize de string (query real) a numero', () => {
      const instance = plainToInstance(ListDocumentsQueryDto, { page: '2', pageSize: '10' });

      expect(instance.page).toBe(2);
      expect(instance.pageSize).toBe(10);
    });
  });

  describe('filtros autorizados', () => {
    it('acepta status con un valor real del enum', async () => {
      const errors = await validateQuery({ status: DocumentStatus.PROCESSED });

      expect(errors).toHaveLength(0);
    });

    it('rechaza status con un valor fuera del enum', async () => {
      const errors = await validateQuery({ status: 'NOT_A_REAL_STATUS' });

      expect(errors.some((e) => e.property === 'status')).toBe(true);
    });

    it('acepta fileType con un valor real del enum', async () => {
      const errors = await validateQuery({ fileType: DocumentFileType.XML });

      expect(errors).toHaveLength(0);
    });

    it('rechaza fileType con un valor fuera del enum', async () => {
      const errors = await validateQuery({ fileType: 'DOCX' });

      expect(errors.some((e) => e.property === 'fileType')).toBe(true);
    });
  });

  describe('orden', () => {
    // La clase ListDocumentsQueryDto no declara ningun campo de tipo "sort"
    // (hecho verificable en tiempo de compilacion: `instance.sort` ni
    // siquiera tipa). La propiedad de seguridad real — que el cliente no
    // puede colar un campo de orden libre — la prueba el whitelisting:
    it('un campo "sort" enviado por el cliente es rechazado como no whitelisteado', async () => {
      const errors = await validateQuery({ sort: 'originalFilename:asc' });

      expect(errors.some((e) => e.property === 'sort')).toBe(true);
    });
  });
});
