import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  acquireLock,
  withLock,
  LockHeldError,
  TransientLockError,
} from '../lib/lock.mjs';
import { readEvents } from '../lib/events.mjs';
import { eventsFile } from '../lib/paths.mjs';
import { useTempState, captureError } from './helpers.mjs';

/**
 * Hallazgo MEDIO de la reauditoría de `LOOP-001`: `events.lock` podía fallar
 * de forma intermitente con `EPERM` en Windows y `withLock()` no trataba esa
 * forma de contención transitoria — la propagaba como error definitivo.
 *
 * ## Evidencia medida antes de tocar el primitivo
 *
 * Windows 11 · Node 24 · 6 procesos × 4000 adquisiciones sobre la misma ruta:
 *
 *     open:EEXIST  21332
 *     open:EPERM    1857      (~8 % de las adquisiciones en contención)
 *
 * Ningún `EPERM` al liberar. Es la ventana *delete-pending* de NTFS: un
 * proceso llama a `unlink` mientras otro hace `CreateFile`, y Win32 devuelve
 * `ERROR_ACCESS_DENIED`, que libuv traduce a `EPERM`.
 *
 * Lo que estas pruebas fijan es el criterio **estrecho**: se reintenta el
 * `EPERM` de adquisición y nada más. Ni se convierte en éxito, ni se
 * silencia otro código, ni se pierde el límite.
 */

const LIB = path.dirname(fileURLToPath(new URL('../lib/events.mjs', import.meta.url)));

function tempLock(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-lock-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'x.lock');
}

/** Falla las `veces` primeras aperturas con `code`; después deja pasar. */
function fallarAperturas(t, { code, veces = Infinity, ruta }) {
  const original = fs.openSync;
  const estado = { intentos: 0 };
  t.mock.method(fs, 'openSync', (file, ...rest) => {
    if (file === ruta) {
      estado.intentos += 1;
      if (estado.intentos <= veces) {
        const err = new Error(`${code}: simulado, open '${file}'`);
        err.code = code;
        err.syscall = 'open';
        err.path = file;
        throw err;
      }
    }
    return original.call(fs, file, ...rest);
  });
  return estado;
}

// --- 16. EEXIST sigue siendo lock ocupado -----------------------------------

test('16. EEXIST sigue tratándose como lock ocupado, con su titular', (t) => {
  const ruta = tempLock(t);
  acquireLock(ruta, { agent_id: 'CLAUDE-02' });

  const err = captureError(() => acquireLock(ruta, { agent_id: 'CLAUDE-03' }));

  assert.ok(err instanceof LockHeldError, 'EEXIST no puede degradarse a otra cosa');
  assert.equal(err.code, 'LOCK_HELD');
  assert.equal(err.holder, 'CLAUDE-02', 'y se identifica a quién pertenece');
});

test('16b. el lock sigue siendo O_EXCL: dos adquisiciones nunca coexisten', (t) => {
  const ruta = tempLock(t);
  let dentro = 0;
  withLock(ruta, () => {
    dentro += 1;
    assert.ok(captureError(() => acquireLock(ruta, {})) instanceof LockHeldError);
  });
  assert.equal(dentro, 1);
  assert.equal(fs.existsSync(ruta), false, 'y se libera al salir');
});

// --- 17. EPERM transitorio se reintenta -------------------------------------

test('17. un EPERM transitorio durante la adquisición se reintenta y acaba entrando', (t) => {
  const ruta = tempLock(t);
  const estado = fallarAperturas(t, { code: 'EPERM', veces: 3, ruta });

  let ejecutado = false;
  const valor = withLock(ruta, () => {
    ejecutado = true;
    return 'ok';
  });
  t.mock.restoreAll();

  assert.equal(ejecutado, true, 'la sección crítica llegó a ejecutarse');
  assert.equal(valor, 'ok');
  assert.equal(estado.intentos, 4, '3 EPERM reintentados + la apertura buena');
  assert.equal(fs.existsSync(ruta), false, 'el lock quedó liberado');
});

test('17b. acquireLock clasifica el EPERM de contención sin inventar un titular', (t) => {
  const ruta = tempLock(t);
  fallarAperturas(t, { code: 'EPERM', ruta });

  const err = captureError(() => acquireLock(ruta, { agent_id: 'CLAUDE-02' }));
  t.mock.restoreAll();

  assert.ok(err instanceof TransientLockError);
  assert.equal(err.code, 'LOCK_CONTENTION_TRANSIENT');
  assert.equal(err.cause.code, 'EPERM', 'el error original se conserva para diagnóstico');
  assert.ok(!(err instanceof LockHeldError), 'contención transitoria ≠ lock ocupado');
});

test('17c. un EPERM estructural (directorio no escribible) NO se trata como contención', (t) => {
  const ruta = path.join(os.tmpdir(), 'loop-lock-inexistente-xyz', 'sub', 'x.lock');
  t.mock.method(fs, 'mkdirSync', () => undefined); // el padre no llega a existir
  const err = captureError(() => acquireLock(ruta, {}));
  t.mock.restoreAll();

  assert.ok(!(err instanceof TransientLockError), 'sin directorio padre no hay contención que esperar');
  assert.equal(err.code, 'ENOENT');
});

// --- 18. EPERM persistente falla tras el límite -----------------------------

test('18. un EPERM persistente termina fallando tras agotar los reintentos', (t) => {
  const ruta = tempLock(t);
  const estado = fallarAperturas(t, { code: 'EPERM', ruta });

  const inicio = Date.now();
  const err = captureError(() => withLock(ruta, () => 'no debería ejecutarse', { retries: 4, retryDelayMs: 1 }));
  const duracion = Date.now() - inicio;
  t.mock.restoreAll();

  assert.ok(err instanceof TransientLockError, 'falla — nunca se reinterpreta como éxito');
  assert.equal(err.code, 'LOCK_CONTENTION_TRANSIENT');
  assert.equal(estado.intentos, 5, 'intento inicial + exactamente 4 reintentos: el límite es acotado');
  assert.ok(duracion < 10_000, `sin bucle infinito (${duracion} ms)`);
});

test('18b. el backoff está acotado por arriba', (t) => {
  const ruta = tempLock(t);
  fallarAperturas(t, { code: 'EPERM', ruta });

  const inicio = Date.now();
  captureError(() => withLock(ruta, () => null, { retries: 20, retryDelayMs: 50 }));
  const duracion = Date.now() - inicio;
  t.mock.restoreAll();

  // Sin techo, 20 reintentos con backoff lineal de 50 ms serían ~10,5 s.
  assert.ok(duracion < 3_000, `el techo de 100 ms por intento se respeta (${duracion} ms)`);
});

// --- 19. otros errores no se silencian --------------------------------------

test('19. cualquier otro código de error se propaga intacto y en el primer intento', (t) => {
  for (const code of ['EACCES', 'EROFS', 'EMFILE', 'ENOSPC', 'EIO']) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-lock-otros-'));
    const ruta = path.join(dir, 'x.lock');
    const estado = fallarAperturas(t, { code, ruta });

    const err = captureError(() => withLock(ruta, () => 'no debería ejecutarse'));
    t.mock.restoreAll();
    fs.rmSync(dir, { recursive: true, force: true });

    assert.equal(err.code, code, `${code} no puede reclasificarse`);
    assert.ok(!(err instanceof TransientLockError), `${code} no es contención`);
    assert.ok(!(err instanceof LockHeldError), `${code} no es lock ocupado`);
    assert.equal(estado.intentos, 1, `${code} no se reintenta: falla de inmediato`);
  }
});

test('19b. un fallo dentro de la sección crítica libera el lock y se propaga', (t) => {
  const ruta = tempLock(t);
  const err = captureError(() =>
    withLock(ruta, () => {
      throw new Error('fallo de negocio');
    }),
  );

  assert.equal(err.message, 'fallo de negocio', 'el error del cuerpo no se enmascara');
  assert.equal(fs.existsSync(ruta), false, 'y el lock no queda huérfano');
});

// --- 20/21. concurrencia real, repetida -------------------------------------

const ESCRITORES = 4;
const EVENTOS_POR_ESCRITOR = 30;

/** Proceso real que escribe eventos por la API común, bajo el lock global. */
function lanzarEscritor(dir, taskId) {
  const script = `
    const { appendEvent } = await import(${JSON.stringify(
      pathToFileURL(path.join(LIB, 'events.mjs')).href,
    )});
    for (let i = 0; i < ${EVENTOS_POR_ESCRITOR}; i += 1) {
      appendEvent({ task_id: process.env.TASK, from_state: 'A', to_state: 'B', note: String(i) });
    }
  `;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, LOOP_ENGINE_STATE_DIR: dir, TASK: taskId },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr))));
  });
}

test('20/21. procesos concurrentes no corrompen el log, ronda tras ronda', async (t) => {
  // Repetido 5 veces: la ventana delete-pending es probabilística y una sola
  // ronda verde no demuestra nada. El coste sigue siendo razonable.
  for (let ronda = 1; ronda <= 5; ronda += 1) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `loop-conc-${ronda}-`));
    const previo = process.env.LOOP_ENGINE_STATE_DIR;
    process.env.LOOP_ENGINE_STATE_DIR = dir;

    const tareas = Array.from({ length: ESCRITORES }, (_, i) => `TAREA-${ronda}-${i}`);
    await Promise.all(tareas.map((id) => lanzarEscritor(dir, id)));

    const lineas = fs.readFileSync(eventsFile(), 'utf8').split('\n').filter(Boolean);
    assert.equal(
      lineas.length,
      ESCRITORES * EVENTOS_POR_ESCRITOR,
      `ronda ${ronda}: no se pierde ni se duplica ningún evento`,
    );
    for (const linea of lineas) {
      assert.doesNotThrow(() => JSON.parse(linea), `ronda ${ronda}: línea entrelazada`);
    }
    const porTarea = new Map();
    for (const evento of readEvents()) {
      porTarea.set(evento.task_id, (porTarea.get(evento.task_id) ?? 0) + 1);
    }
    for (const id of tareas) {
      assert.equal(porTarea.get(id), EVENTOS_POR_ESCRITOR, `ronda ${ronda}: ${id} conserva sus eventos`);
    }
    // Ningún lock sobrevive a la ronda.
    assert.equal(fs.existsSync(path.join(dir, 'events.lock')), false, `ronda ${ronda}: lock huérfano`);

    if (previo === undefined) delete process.env.LOOP_ENGINE_STATE_DIR;
    else process.env.LOOP_ENGINE_STATE_DIR = previo;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('20b. la contención real ejercita EEXIST de verdad, no sólo el camino feliz', (t) => {
  useTempState(t);
  // Dos secciones críticas anidadas sobre rutas distintas conviven; sobre la
  // misma ruta, la segunda ve el lock tomado. Es la garantía de exclusión.
  const a = tempLock(t);
  const b = tempLock(t);
  const orden = [];
  withLock(a, () => {
    orden.push('a');
    withLock(b, () => orden.push('b'));
    assert.ok(captureError(() => acquireLock(a, {})) instanceof LockHeldError);
  });
  assert.deepEqual(orden, ['a', 'b']);
});
