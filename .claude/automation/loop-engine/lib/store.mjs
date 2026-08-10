import fs from 'node:fs';
import path from 'node:path';
import { stateDir, taskStateFile, stateMutationLockFile } from './paths.mjs';
import { withLock } from './lock.mjs';
import { loadQueue, findDefinition, instantiate } from './queue.mjs';

/**
 * Estado de ejecución por tarjeta: `state/<task_id>.json`.
 *
 * Todo lo que vive aquí es efímero e ignorado por Git (arquitectura §8).
 * `queue.yaml` es la intención versionada; este módulo sólo lee de ella
 * (vía `instantiate`) y **nunca la escribe**.
 */

function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Math.trunc(performance.now())}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  // `rename` reemplaza el destino de forma atómica en POSIX y en Windows.
  fs.renameSync(tmp, file);
}

export function readTaskState(taskId) {
  const file = taskStateFile(taskId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeTaskState(task) {
  writeAtomic(taskStateFile(task.task_id), task);
  return task;
}

/**
 * Devuelve la instancia de runtime de una tarjeta, creándola desde
 * `queue.yaml` la primera vez. Es el único punto donde una definición
 * versionada se convierte en estado.
 */
export function getOrCreateTaskState(taskId, { queue } = {}) {
  const existing = readTaskState(taskId);
  if (existing) return existing;

  const loaded = queue ?? loadQueue();
  const definition = findDefinition(loaded, taskId);
  if (!definition) throw new Error(`Tarjeta desconocida en queue.yaml: ${taskId}`);

  const instance = instantiate(definition);
  writeTaskState(instance);
  return instance;
}

/** Sección crítica leer-modificar-escribir sobre una tarjeta. */
export function mutateTaskState(taskId, mutator) {
  fs.mkdirSync(stateDir(), { recursive: true });
  return withLock(stateMutationLockFile(), () => {
    const current = getOrCreateTaskState(taskId);
    const next = mutator({ ...current }) ?? current;
    writeTaskState(next);
    return next;
  });
}

/**
 * Vista completa: toda tarjeta de `queue.yaml` más su estado de runtime si
 * ya existe. Una tarjeta sin instancia se muestra con su estado inicial,
 * sin crearla — listar no debe tener efectos.
 */
export function listTasks({ queue } = {}) {
  const loaded = queue ?? loadQueue();
  return loaded.tasks.map((definition) => {
    const runtime = readTaskState(definition.task_id);
    return runtime ?? { ...instantiate(definition), _instantiated: false };
  });
}
