import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sharedContractConflicts } from '../lib/contracts.mjs';
import { runtimeTask } from './helpers.mjs';

// --- 11. shared contract collision -------------------------------------------

test('A escribe lo que B declara leer como contrato: colisión aunque sus allowed_write no se toquen', () => {
  const a = runtimeTask({
    task_id: 'A',
    allowed_write: ['apps/api/src/modules/documents/dto.ts'],
  });
  const b = runtimeTask({
    task_id: 'B',
    allowed_write: ['apps/web/src/lib/documents-client.ts'],
    reads_contract: ['apps/api/src/modules/documents/dto.ts'],
  });
  // Confirmar la premisa: sin solape directo de allowed_write.
  assert.notEqual(a.allowed_write[0], b.allowed_write[0]);

  const conflicts = sharedContractConflicts(a, [b]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].check, 'SHARED_CONTRACT');
  assert.equal(conflicts[0].with, 'B');
  assert.equal(conflicts[0].blocked_reason, 'shared_contract_collision');
});

test('la colisión es bidireccional: también se detecta si el orden se invierte', () => {
  const a = runtimeTask({
    task_id: 'A',
    allowed_write: ['apps/api/src/modules/documents/dto.ts'],
  });
  const b = runtimeTask({
    task_id: 'B',
    allowed_write: ['apps/web/src/lib/documents-client.ts'],
    reads_contract: ['apps/api/src/modules/documents/dto.ts'],
  });
  const conflicts = sharedContractConflicts(b, [a]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].with, 'A');
});

test('un glob en reads_contract también colisiona, no sólo rutas literales', () => {
  const a = runtimeTask({ task_id: 'A', allowed_write: ['packages/database/prisma/schema.prisma'] });
  const b = runtimeTask({
    task_id: 'B',
    allowed_write: ['apps/api/src/modules/x/x.service.ts'],
    reads_contract: ['packages/database/prisma/**'],
  });
  assert.equal(sharedContractConflicts(a, [b]).length, 1);
});

test('contract-driven, no keyword guessing: un nombre "client.ts" sin reads_contract declarado no colisiona', () => {
  // El motor no adivina por el nombre del archivo — sólo por lo declarado.
  const a = runtimeTask({ task_id: 'A', allowed_write: ['apps/web/src/lib/other-client.ts'] });
  const b = runtimeTask({ task_id: 'B', allowed_write: ['apps/web/src/lib/documents-client.ts'] });
  assert.deepEqual(sharedContractConflicts(a, [b]), []);
});

// --- 12. unrelated contracts parallel ---------------------------------------

test('contratos no relacionados no colisionan', () => {
  const a = runtimeTask({
    task_id: 'A',
    allowed_write: ['apps/web/src/app/documentos/**'],
    reads_contract: ['apps/web/src/lib/documents-client.ts'],
  });
  const b = runtimeTask({
    task_id: 'B',
    allowed_write: ['apps/web/src/app/fiscal/**'],
    reads_contract: ['apps/web/src/lib/fiscal-client.ts'],
  });
  assert.deepEqual(sharedContractConflicts(a, [b]), []);
});

test('sin reads_contract declarado en ningún lado, nunca hay colisión de contrato', () => {
  const a = runtimeTask({ task_id: 'A', allowed_write: ['a/**'] });
  const b = runtimeTask({ task_id: 'B', allowed_write: ['b/**'] });
  assert.deepEqual(sharedContractConflicts(a, [b]), []);
});
