import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDefinition, instantiate, DEFINITION_FIELDS_VERSION } from '../lib/queue.mjs';
import { taskDefinition } from './helpers.mjs';

/**
 * `decision_refs` es el único campo de definición que añade `LOOP-002`
 * (§10.4). Estas pruebas verifican lo que pide la misión explícitamente:
 * versionar, validar, rechazar formas malformadas y no reinterpretar en
 * silencio las tarjetas `v1` que no lo declaran.
 */

test('DEFINITION_FIELDS_VERSION avanzó a 2 con LOOP-002', () => {
  assert.equal(DEFINITION_FIELDS_VERSION, 2);
});

// --- compatibilidad hacia atrás ----------------------------------------------

test('una tarjeta v1 sin decision_refs sigue siendo válida, sin reinterpretación', () => {
  const definition = taskDefinition({ base_commit: 'abc' });
  assert.equal('decision_refs' in definition, false);
  assert.deepEqual(validateDefinition(definition, 0), []);

  // La ausencia del campo se lee como "sin decisiones declaradas", nunca
  // como "todas aprobadas" ni como error.
  const instance = instantiate(definition);
  assert.deepEqual(instance.decision_refs, []);
});

// --- rechazo de formas malformadas -------------------------------------------

test('decision_refs debe ser una lista', () => {
  const errors = validateDefinition(
    taskDefinition({ base_commit: 'abc', decision_refs: 'D-014' }),
    0,
  );
  assert.ok(errors.some((e) => e.includes('"decision_refs" debe ser una lista')));
});

test('un decision_refs con forma inválida se rechaza, no se ignora en silencio', () => {
  for (const malformed of ['D014', 'd-014', 'DECISION-014', '', 'D-', 14, null]) {
    const errors = validateDefinition(
      taskDefinition({ base_commit: 'abc', decision_refs: [malformed] }),
      0,
    );
    assert.ok(
      errors.some((e) => e.includes('decision_refs')),
      `"${malformed}" debía rechazarse`,
    );
  }
});

test('decision_refs con la forma canónica D-NNN y D-NNN.N se acepta', () => {
  const errors = validateDefinition(
    taskDefinition({ base_commit: 'abc', decision_refs: ['D-010', 'D-002.1', 'D-014'] }),
    0,
  );
  assert.deepEqual(errors, []);
});

test('instantiate copia decision_refs sin alterarlo', () => {
  const instance = instantiate(
    taskDefinition({ base_commit: 'abc', decision_refs: ['D-010', 'D-011'] }),
  );
  assert.deepEqual(instance.decision_refs, ['D-010', 'D-011']);
});

// --- decision_refs es contrato, no runtime -----------------------------------

test('decision_refs no puede aparecer como campo de runtime en queue.yaml (ya lo es de definición)', () => {
  // A diferencia de RUNTIME_FIELDS, decision_refs se declara en queue.yaml:
  // esto sólo confirma que una tarjeta READY con decision_refs sigue
  // exigiendo el resto del contrato normalmente (no se vuelve un campo
  // sustitutivo de base_commit/allowed_write/test_commands).
  const errors = validateDefinition(
    { task_id: 'A', mission_id: 'M', title: 'T', risk_class: 'STANDARD', decision_refs: ['D-014'] },
    0,
  );
  assert.ok(errors.some((e) => e.includes('base_commit')));
});
