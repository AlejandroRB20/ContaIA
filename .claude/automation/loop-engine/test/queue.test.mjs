import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml, YamlParseError } from '../lib/yaml.mjs';
import { loadQueue, validateDefinition, instantiate, RUNTIME_FIELDS, QueueValidationError } from '../lib/queue.mjs';
import { listTasks, getOrCreateTaskState, readTaskState } from '../lib/store.mjs';
import { transitionTask } from '../lib/dispatcher.mjs';
import { queueFile } from '../lib/paths.mjs';
import { useTempState, useTempQueue, taskDefinition, captureError } from './helpers.mjs';

const REAL_QUEUE = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  'queue.yaml',
);

// --- lector de YAML ---------------------------------------------------------

test('parseYaml soporta el subconjunto que queue.yaml necesita', () => {
  const parsed = parseYaml(
    [
      'version: 1',
      'tasks:',
      '  - task_id: A',
      '    title: "Con espacios"',
      '    dependencies: []',
      '    flag: true',
      '    nada: null',
      '    allowed_write:',
      '      - src/**',
      '      - docs/*.md',
      '  - task_id: B',
      '    dependencies:',
      '      - A',
    ].join('\n'),
  );
  assert.equal(parsed.version, 1);
  assert.equal(parsed.tasks.length, 2);
  assert.equal(parsed.tasks[0].title, 'Con espacios');
  assert.deepEqual(parsed.tasks[0].dependencies, []);
  assert.equal(parsed.tasks[0].flag, true);
  assert.equal(parsed.tasks[0].nada, null);
  assert.deepEqual(parsed.tasks[0].allowed_write, ['src/**', 'docs/*.md']);
  assert.deepEqual(parsed.tasks[1].dependencies, ['A']);
});

test('parseYaml ignora comentarios pero no un # dentro de comillas', () => {
  const parsed = parseYaml(['# comentario', 'a: 1 # al final', 'b: "con # dentro"'].join('\n'));
  assert.equal(parsed.a, 1);
  assert.equal(parsed.b, 'con # dentro');
});

test('parseYaml falla ruidosamente ante sintaxis no soportada', () => {
  for (const source of [
    'a: &ancla valor',
    'a: |\n  bloque',
    'a: [1, 2]',
    '---\na: 1',
  ]) {
    assert.throws(() => parseYaml(source), YamlParseError, `debe rechazar: ${source}`);
  }
});

test('parseYaml rechaza tabuladores en la indentación', () => {
  assert.throws(() => parseYaml('a:\n\tb: 1'), YamlParseError);
});

// --- separación queue.yaml (versionado) / state (runtime) -------------------

test('una definición no puede declarar estado de ejecución', () => {
  for (const field of RUNTIME_FIELDS.filter((f) => f !== 'state')) {
    const errors = validateDefinition(taskDefinition({ [field]: 'x', base_commit: 'abc' }), 0);
    assert.ok(
      errors.some((e) => e.includes(field)),
      `"${field}" debe rechazarse en queue.yaml`,
    );
  }
});

test('una tarjeta READY exige el contrato completo; una BLOCKED no', () => {
  const incompleteReady = validateDefinition(
    { task_id: 'A', mission_id: 'M', title: 'T', risk_class: 'STANDARD', state: 'READY' },
    0,
  );
  assert.ok(incompleteReady.some((e) => e.includes('base_commit')));
  assert.ok(incompleteReady.some((e) => e.includes('allowed_write')));

  const incompleteBlocked = validateDefinition(
    { task_id: 'A', mission_id: 'M', title: 'T', risk_class: 'STANDARD', state: 'BLOCKED' },
    0,
  );
  assert.deepEqual(incompleteBlocked, [], 'una tarjeta bloqueada puede no tener contrato aún');
});

test('risk_class y state deben ser canónicos', () => {
  assert.ok(
    validateDefinition(taskDefinition({ risk_class: 'INVENTADA', base_commit: 'a' }), 0).some((e) =>
      e.includes('risk_class'),
    ),
  );
  assert.ok(
    validateDefinition(taskDefinition({ state: 'IN_QA', base_commit: 'a' }), 0).some((e) =>
      e.includes('no es canónico'),
    ),
  );
});

test('task_id duplicado invalida la cola entera', (t) => {
  useTempQueue(t, [
    taskDefinition({ task_id: 'DUP', base_commit: 'a' }),
    taskDefinition({ task_id: 'DUP', base_commit: 'a' }),
  ]);
  const err = captureError(() => loadQueue());
  assert.ok(err instanceof QueueValidationError);
  assert.ok(err.errors.some((e) => e.includes('duplicado')));
});

test('instantiate proyecta el contrato y añade runtime en su valor inicial', () => {
  const instance = instantiate(taskDefinition({ base_commit: 'abc' }));
  assert.equal(instance.state, 'READY');
  assert.equal(instance.repair_iteration, 0);
  assert.equal(instance.qa_iteration, 0);
  assert.equal(instance.owner, null);
  assert.equal(instance.worktree, null);
  assert.equal(instance.candidate_commit, null);
  assert.equal(instance.base_commit, 'abc');
});

test('el runtime NUNCA reescribe queue.yaml', (t) => {
  useTempState(t);
  const file = useTempQueue(t, [taskDefinition({ base_commit: 'abc' })]);
  const before = fs.readFileSync(file, 'utf8');

  getOrCreateTaskState('LOOP-TEST-001');
  transitionTask({
    taskId: 'LOOP-TEST-001',
    to: 'BLOCKED',
    actor: { type: 'agent', id: 'A' },
    reason: 'prueba',
    blockedReason: 'unclassified',
  });

  assert.equal(fs.readFileSync(file, 'utf8'), before, 'queue.yaml debe quedar intacto');
  assert.equal(readTaskState('LOOP-TEST-001').state, 'BLOCKED', 'el cambio vive en state/');
});

test('listar no instancia estado: no tiene efectos secundarios', (t) => {
  useTempState(t);
  useTempQueue(t, [taskDefinition({ base_commit: 'abc' })]);

  const listed = listTasks();
  assert.equal(listed.length, 1);
  assert.equal(listed[0]._instantiated, false);
  assert.equal(readTaskState('LOOP-TEST-001'), null, 'listar no debe crear state/<id>.json');
});

// --- el queue.yaml real del repositorio -------------------------------------

test('el queue.yaml versionado del motor es válido', () => {
  const previous = process.env.LOOP_ENGINE_QUEUE_FILE;
  process.env.LOOP_ENGINE_QUEUE_FILE = REAL_QUEUE;
  try {
    const queue = loadQueue();
    assert.equal(queue.tasks.length, 7, 'las 7 tarjetas de nightly-queue.md');
    for (const task of queue.tasks) {
      assert.notEqual(task.state, 'READY', `${task.task_id} no debe ser despachable sin humano`);
      assert.equal(task.human_gate_required, true);
    }
  } finally {
    if (previous === undefined) delete process.env.LOOP_ENGINE_QUEUE_FILE;
    else process.env.LOOP_ENGINE_QUEUE_FILE = previous;
  }
});

test('las dependencias de nightly-queue.md se conservan sin cambios', () => {
  const previous = process.env.LOOP_ENGINE_QUEUE_FILE;
  process.env.LOOP_ENGINE_QUEUE_FILE = REAL_QUEUE;
  try {
    const byId = new Map(loadQueue().tasks.map((t) => [t.task_id, t]));
    assert.deepEqual(byId.get('E5-S3-T06').dependencies, []);
    assert.deepEqual(byId.get('E5-S3-T07').dependencies, ['E5-S3-T06']);
    assert.deepEqual(byId.get('E5-S3-T08').dependencies, ['E5-S3-T07']);
    assert.deepEqual(byId.get('E5-S3-T12').dependencies, ['E5-S3-T11']);
  } finally {
    if (previous === undefined) delete process.env.LOOP_ENGINE_QUEUE_FILE;
    else process.env.LOOP_ENGINE_QUEUE_FILE = previous;
  }
});

test('queueFile() apunta a queue.yaml, no a un JSON dentro de state/', () => {
  const previous = process.env.LOOP_ENGINE_QUEUE_FILE;
  delete process.env.LOOP_ENGINE_QUEUE_FILE;
  try {
    const file = queueFile().replace(/\\/g, '/');
    assert.ok(file.endsWith('/queue.yaml'));
    assert.equal(file.includes('/state/'), false, 'la cola versionada no vive en state/');
  } finally {
    if (previous !== undefined) process.env.LOOP_ENGINE_QUEUE_FILE = previous;
  }
});
