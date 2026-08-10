import fs from 'node:fs';
import path from 'node:path';

/**
 * Exclusión mutua por creación exclusiva de archivo (`O_CREAT|O_EXCL`,
 * flag `'wx'`): una única syscall atómica, sin infraestructura nueva.
 * Primitiva aportada por Claude-02 (`7bdf159`) y conservada íntegra —
 * es la que exige la arquitectura §9.
 *
 * Regla no negociable (arquitectura §9.6): **nadie borra un lock ajeno.**
 * `releaseLock` exige confirmación explícita, siguiendo el patrón de
 * `releaseClaim` de Claude-03 (`2e128c7`).
 */

export class LockHeldError extends Error {
  constructor(lockPath, holder) {
    super(`Lock ya existe: ${lockPath}${holder ? ` (agente ${holder})` : ''}`);
    this.name = 'LockHeldError';
    this.code = 'LOCK_HELD';
    this.lockPath = lockPath;
    this.holder = holder ?? null;
  }
}

export class ForeignLockError extends Error {
  constructor(lockPath, holder, requester) {
    super(
      `El lock ${lockPath} pertenece a "${holder}"; lo intenta liberar "${requester}". ` +
        'Nadie borra un lock ajeno (arquitectura §9.6).',
    );
    this.name = 'ForeignLockError';
    this.code = 'FOREIGN_LOCK';
  }
}

export function acquireLock(lockPath, payload) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let fd;
  try {
    fd = fs.openSync(lockPath, 'wx');
  } catch (err) {
    if (err.code === 'EEXIST') {
      throw new LockHeldError(lockPath, readLock(lockPath)?.agent_id);
    }
    throw err;
  }
  const now = new Date().toISOString();
  const record = { ...payload, created_at: now, heartbeat_at: now };
  try {
    fs.writeSync(fd, JSON.stringify(record, null, 2));
  } finally {
    fs.closeSync(fd);
  }
  return record;
}

export function readLock(lockPath) {
  if (!fs.existsSync(lockPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch {
    return null;
  }
}

/** Refresca `heartbeat_at`. Sólo el dueño puede refrescar (arquitectura §9.5). */
export function refreshHeartbeat(lockPath, agentId) {
  const lock = readLock(lockPath);
  if (!lock) return null;
  if (lock.agent_id !== agentId) throw new ForeignLockError(lockPath, lock.agent_id, agentId);
  const updated = { ...lock, heartbeat_at: new Date().toISOString() };
  fs.writeFileSync(lockPath, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

/**
 * Libera un lock. Exige `agentId` coincidente **y** `confirmed: true`.
 * La confirmación explícita impide liberar por inferencia de staleness —
 * regla de `releaseClaim` de Claude-03, adoptada aquí.
 */
export function releaseLock(lockPath, { agentId, confirmed } = {}) {
  const lock = readLock(lockPath);
  if (!lock) return false;
  if (confirmed !== true) {
    throw new Error(
      `releaseLock exige confirmación explícita (confirmed: true) para ${lockPath}.`,
    );
  }
  if (agentId && lock.agent_id && lock.agent_id !== agentId) {
    throw new ForeignLockError(lockPath, lock.agent_id, agentId);
  }
  fs.rmSync(lockPath);
  return true;
}

/**
 * Sección crítica breve (leer-modificar-escribir de estado). A diferencia
 * del lock de posesión de tarjeta, éste sí reintenta: es contención
 * esperada entre procesos, no un conflicto de autoridad.
 */
export function withLock(lockPath, fn, { retries = 50, retryDelayMs = 20 } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      acquireLock(lockPath, { purpose: 'critical-section', pid_hint: process.pid });
      break;
    } catch (err) {
      if (!(err instanceof LockHeldError) || attempt >= retries) throw err;
      attempt += 1;
      sleepSync(retryDelayMs);
    }
  }
  try {
    return fn();
  } finally {
    try {
      fs.rmSync(lockPath);
    } catch {
      /* la sección crítica ya terminó; su lock puede haberse limpiado */
    }
  }
}

function sleepSync(ms) {
  const view = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(view, 0, 0, ms);
}
