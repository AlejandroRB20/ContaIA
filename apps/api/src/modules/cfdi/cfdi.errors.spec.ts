import { UnrecoverableError } from 'bullmq';

import {
  AgregadoNoVerificadoError,
  TransicionNoConfirmadaError,
  ViolacionDeInvarianteError,
} from './cfdi.errors';

describe('ViolacionDeInvarianteError', () => {
  it('es una instancia distinguible de Error, con nombre y mensaje correctos', () => {
    const error = new ViolacionDeInvarianteError('cfdi_preexistente_con_document_processing');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ViolacionDeInvarianteError);
    expect(error.name).toBe('ViolacionDeInvarianteError');
    expect(error.message).toBe(
      'Violación de invariante detectada bajo D-007: cfdi_preexistente_con_document_processing',
    );
  });

  it('expone razon como dato relevante y lo incluye en el mensaje', () => {
    const error = new ViolacionDeInvarianteError('concept_tax_correspondence_mismatch');

    expect(error.razon).toBe('concept_tax_correspondence_mismatch');
    expect(error.message).toContain('concept_tax_correspondence_mismatch');
  });

  it('incluye el detalle opcional en el mensaje cuando se provee', () => {
    const error = new ViolacionDeInvarianteError(
      'cfdi_preexistente_con_document_processing',
      'documentId=doc-1',
    );

    expect(error.message).toBe(
      'Violación de invariante detectada bajo D-007: cfdi_preexistente_con_document_processing — documentId=doc-1',
    );
  });
});

describe('TransicionNoConfirmadaError — recurso "document"', () => {
  it('count === 0: expone recurso, count, nombre y mensaje correctos', () => {
    const error = new TransicionNoConfirmadaError('document', 0);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TransicionNoConfirmadaError);
    expect(error.name).toBe('TransicionNoConfirmadaError');
    expect(error.recurso).toBe('document');
    expect(error.count).toBe(0);
    expect(error.message).toBe(
      "Transición terminal no confirmada para 'document': updateMany devolvió count=0 (se esperaba exactamente 1). Rollback total.",
    );
  });

  it('count > 1: expone recurso, count, nombre y mensaje correctos', () => {
    const error = new TransicionNoConfirmadaError('document', 2);

    expect(error.recurso).toBe('document');
    expect(error.count).toBe(2);
    expect(error.name).toBe('TransicionNoConfirmadaError');
    expect(error.message).toBe(
      "Transición terminal no confirmada para 'document': updateMany devolvió count=2 (se esperaba exactamente 1). Rollback total.",
    );
  });
});

describe('TransicionNoConfirmadaError — recurso "job"', () => {
  it('count === 0: expone recurso, count, nombre y mensaje correctos', () => {
    const error = new TransicionNoConfirmadaError('job', 0);

    expect(error.recurso).toBe('job');
    expect(error.count).toBe(0);
    expect(error.name).toBe('TransicionNoConfirmadaError');
    expect(error.message).toBe(
      "Transición terminal no confirmada para 'job': updateMany devolvió count=0 (se esperaba exactamente 1). Rollback total.",
    );
  });

  it('count > 1: expone recurso, count, nombre y mensaje correctos', () => {
    const error = new TransicionNoConfirmadaError('job', 3);

    expect(error.recurso).toBe('job');
    expect(error.count).toBe(3);
    expect(error.name).toBe('TransicionNoConfirmadaError');
    expect(error.message).toBe(
      "Transición terminal no confirmada para 'job': updateMany devolvió count=3 (se esperaba exactamente 1). Rollback total.",
    );
  });
});

describe('AgregadoNoVerificadoError', () => {
  it('es una instancia distinguible, expone verificacion y arma el mensaje correcto', () => {
    const error = new AgregadoNoVerificadoError(
      'cfdi_tax_positions',
      'posiciones=[1,3], se esperaba exactamente {1..2}',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AgregadoNoVerificadoError);
    expect(error.name).toBe('AgregadoNoVerificadoError');
    expect(error.verificacion).toBe('cfdi_tax_positions');
    expect(error.message).toBe(
      'Verificación estructural del agregado CFDI falló (AD-10.1, cfdi_tax_positions): posiciones=[1,3], se esperaba exactamente {1..2}',
    );
  });

  it.each([
    'concept_count',
    'concept_positions',
    'cfdi_tax_count',
    'cfdi_tax_positions',
    'concept_tax_count',
    'concept_tax_positions',
  ] as const)('acepta la verificación %s y la expone sin transformarla', (verificacion) => {
    const error = new AgregadoNoVerificadoError(verificacion, 'detalle');

    expect(error.verificacion).toBe(verificacion);
  });
});

describe('distinguibilidad mutua entre las tres clases de dominio', () => {
  const violacion = new ViolacionDeInvarianteError('cfdi_preexistente_con_document_processing');
  const transicion = new TransicionNoConfirmadaError('document', 0);
  const agregado = new AgregadoNoVerificadoError('concept_count', 'detalle');

  it('ViolacionDeInvarianteError no es instancia de las otras dos', () => {
    expect(violacion).not.toBeInstanceOf(TransicionNoConfirmadaError);
    expect(violacion).not.toBeInstanceOf(AgregadoNoVerificadoError);
  });

  it('TransicionNoConfirmadaError no es instancia de las otras dos', () => {
    expect(transicion).not.toBeInstanceOf(ViolacionDeInvarianteError);
    expect(transicion).not.toBeInstanceOf(AgregadoNoVerificadoError);
  });

  it('AgregadoNoVerificadoError no es instancia de las otras dos', () => {
    expect(agregado).not.toBeInstanceOf(ViolacionDeInvarianteError);
    expect(agregado).not.toBeInstanceOf(TransicionNoConfirmadaError);
  });

  it('las tres son distinguibles por switch/if sobre instanceof (simulación del catch externo)', () => {
    function clasificar(error: unknown): string {
      if (error instanceof ViolacionDeInvarianteError) return 'violacion';
      if (error instanceof TransicionNoConfirmadaError) return 'transicion';
      if (error instanceof AgregadoNoVerificadoError) return 'agregado';
      return 'desconocido';
    }

    expect(clasificar(violacion)).toBe('violacion');
    expect(clasificar(transicion)).toBe('transicion');
    expect(clasificar(agregado)).toBe('agregado');
  });
});

describe('integración real con BullMQ (bullmq@5.81.1 instalado)', () => {
  it('UnrecoverableError está exportado por el paquete real y es una subclase de Error', () => {
    expect(UnrecoverableError).toBeDefined();

    const error = new UnrecoverableError('mensaje de prueba');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('mensaje de prueba');
  });

  it.each([
    [
      'ViolacionDeInvarianteError',
      new ViolacionDeInvarianteError('cfdi_preexistente_con_document_processing'),
    ],
    ['TransicionNoConfirmadaError', new TransicionNoConfirmadaError('job', 0)],
    ['AgregadoNoVerificadoError', new AgregadoNoVerificadoError('concept_count', 'detalle')],
  ] as const)(
    '%s nunca es UnrecoverableError de BullMQ (AD-11: las tres son recuperables por defecto)',
    (_nombre, error) => {
      expect(error).not.toBeInstanceOf(UnrecoverableError);
    },
  );

  it('UnrecoverableError de BullMQ no es instancia de ninguna clase de dominio de cfdi.errors.ts', () => {
    const error = new UnrecoverableError('permanente');

    expect(error).not.toBeInstanceOf(ViolacionDeInvarianteError);
    expect(error).not.toBeInstanceOf(TransicionNoConfirmadaError);
    expect(error).not.toBeInstanceOf(AgregadoNoVerificadoError);
  });
});
