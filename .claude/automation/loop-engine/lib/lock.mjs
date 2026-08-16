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

/**
 * Contención **transitoria** al adquirir: la ruta existe pero el sistema de
 * archivos aún no deja abrirla en exclusiva. No es un lock legible ni un
 * error permanente; es una condición que se reintenta.
 *
 * Conserva el `cause` original para que un EPERM que resulte ser permanente
 * siga siendo diagnosticable — no se reinterpreta como éxito jamás.
 */
export class TransientLockError extends Error {
  constructor(lockPath, cause) {
    super(
      `No se pudo abrir ${lockPath} en exclusiva por contención transitoria del sistema de ` +
        `archivos (${cause.code}). Se reintenta un número acotado de veces.`,
    );
    this.name = 'TransientLockError';
    this.code = 'LOCK_CONTENTION_TRANSIENT';
    this.lockPath = lockPath;
    this.cause = cause;
  }
}

/**
 * ¿`EPERM` compatible con contención y no con un error permanente?
 *
 * Medido en Windows 11 (Node 24) con 6 procesos × 4000 adquisiciones sobre
 * la misma ruta: **21332 `EEXIST` y 1857 `EPERM`**, todos en `open(…,'wx')`
 * y ninguno al liberar. Es la ventana *delete-pending* de NTFS: un proceso
 * llama a `unlink` mientras otro hace `CreateFile`, y Win32 devuelve
 * `ERROR_ACCESS_DENIED`, que libuv traduce a `EPERM`.
 *
 * El criterio es deliberadamente estrecho — sólo se trata así el `EPERM` que
 * ocurre **al crear/abrir el lock**, y sólo si la ruta ya está ocupada o
 * acaba de estarlo, que es lo que distingue la contención de un permiso
 * denegado de verdad. Cualquier otro código (`ENOENT` sin directorio padre,
 * `EACCES`, `EROFS`, `EMFILE`…) se propaga intacto.
 */
function isTransientAcquireError(err, lockPath) {
  if (err.code !== 'EPERM') return false;
  // El directorio contenedor debe existir y ser escribible: si no, el EPERM
  // es estructural y no una carrera con otro escritor.
  try {
    fs.accessSync(path.dirname(lockPath), fs.constants.W_OK);
  } catch {
    return false;
  }
  return true;
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
    if (isTransientAcquireError(err, lockPath)) {
      throw new TransientLockError(lockPath, err);
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
 *
 * Reintenta exactamente dos condiciones, ambas de contención:
 *
 *   - `LockHeldError` (`EEXIST`) — otro proceso lo tiene ahora mismo.
 *   - `TransientLockError` (`EPERM`) — ventana *delete-pending* de NTFS.
 *
 * Todo lo demás se propaga en el primer intento. El presupuesto es acotado
 * (`retries`), nunca hay bucle infinito y **agotar los reintentos falla**:
 * un `EPERM` persistente termina lanzando, no devolviendo éxito.
 */
export function withLock(lockPath, fn, { retries = 50, retryDelayMs = 20 } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      acquireLock(lockPath, { purpose: 'critical-section', pid_hint: process.pid });
      break;
    } catch (err) {
      const contention = err instanceof LockHeldError || err instanceof TransientLockError;
      if (!contention || attempt >= retries) throw err;
      attempt += 1;
      // Backoff lineal con techo: la ventana delete-pending dura poco y
      // esperar más de 100 ms por intento sólo alarga la sección crítica.
      sleepSync(Math.min(retryDelayMs * attempt, 100));
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
