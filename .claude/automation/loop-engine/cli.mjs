#!/usr/bin/env node
/**
 * CLI del Loop Engine. Sin framework de parsing: el espacio de comandos es
 * pequeño y fijo, `process.argv` alcanza.
 *
 *   list       lista las tarjetas y su estado
 *   status     detalle de una tarjeta + su historial de eventos
 *   claim      despacha la siguiente tarjeta elegible
 *   transition aplica una transición explícita
 *   block      bloquea con motivo tipificado
 *   release    devuelve una tarjeta poseída a READY
 *   resume     desbloquea (EXIGE --human)
 *   validate   valida queue.yaml y el sustrato de gobierno
 *   handoff    el implementador entrega su evidencia en READY_FOR_QA
 *   qa         audita de forma independiente y PERSISTE el resultado
 *   readiness  evalúa READY_FOR_INTEGRATION y genera el manifest
 *
 *   adopt             designación HUMANA del dueño de una tarjeta
 *                     READY_FOR_QA que llegó ahí sin pasar por `claim`
 *   resolve-recovery  resolución HUMANA de una recuperación pendiente
 *   resolve-migration-lock  resolución HUMANA de un cerrojo de migración
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQueue } from './lib/queue.mjs';
import { listTasks, getOrCreateTaskState } from './lib/store.mjs';
import { dispatch, transitionTask, block, release, resume } from './lib/dispatcher.mjs';
import { eventsForTask } from './lib/events.mjs';
import { verifySubstrate } from './lib/substrate.mjs';
import { inspectTask, findRecoverableClaims, resolveRecovery } from './lib/recovery.mjs';
import { describeTaskConditions } from './lib/guard.mjs';
import { submitHandoff, runQa, adoptQaLock } from './lib/qa-session.mjs';
import { evaluateTaskReadiness } from './lib/integration-readiness.mjs';
import { manifestsDir } from './lib/paths.mjs';
import { classifyMigrationLock, releaseMigrationLock } from './lib/migration-lock.mjs';

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

/** Un actor humano debe declararse con `--human`; por defecto es agente. */
function actorFrom(flags) {
  return flags.human
    ? { type: 'human', id: typeof flags.human === 'string' ? flags.human : (flags.agent ?? 'HUMAN') }
    : { type: 'agent', id: flags.agent };
}

function requireTaskId(flags, positional) {
  const taskId = positional[0] ?? flags.task;
  if (!taskId) throw new Error('se requiere <task_id>');
  return taskId;
}

function readJsonFlag(value, label) {
  if (!value || value === true) throw new Error(`se requiere ${label} (ruta a un archivo JSON)`);
  return JSON.parse(fs.readFileSync(value, 'utf8'));
}

const COMMANDS = {
  list(flags) {
    const tasks = listTasks();
    const filtered = flags.state ? tasks.filter((t) => t.state === flags.state) : tasks;
    for (const t of filtered) {
      // Informativo, no decisorio: la condición se muestra junto al estado
      // para que nadie lea `READY` y suponga que la tarjeta es operable.
      const { conditions } = describeTaskConditions(t.task_id, t);
      const marca = conditions.length > 0 ? `\t[${conditions.join(',')}]` : '';
      console.log(
        `${t.task_id}\t${t.state}\t${t.risk_class}\towner=${t.owner ?? '-'}\t${t.title}${marca}`,
      );
    }
    return filtered;
  },

  status(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    const task = getOrCreateTaskState(taskId);
    console.log(JSON.stringify(task, null, 2));

    // `status` informa y no promueve: muestra la condición sin lanzar.
    const conditions = describeTaskConditions(taskId, task);
    if (!conditions.operable) {
      console.log('--- condiciones bloqueantes ---');
      console.log(conditions.conditions.join(', '));
      console.log(
        'La tarjeta NO admite operaciones que la promuevan. ' +
          (conditions.recovery
            ? 'Resolver con `resolve-recovery --human <id> --reason <texto> --confirmed`.'
            : 'Hay una transacción sin confirmar: el estado aún no está respaldado por el log.'),
      );
      if (conditions.recovery_resolution_incomplete) {
        console.log(
          'Resolución INCOMPLETA: el evento ya se registró ' +
            `(transaction_id=${conditions.recovery.resolution_event_appended.transaction_id}) ` +
            'pero la evidencia no llegó a archivarse. Reintentar la misma resolución ' +
            'reconcilia sin duplicar la traza.',
        );
      }
    }

    console.log('--- recuperación ---');
    console.log(JSON.stringify(inspectTask(task), null, 2));
    console.log('--- eventos ---');
    for (const e of eventsForTask(taskId)) {
      console.log(
        `${e.ts}  ${e.from_state} -> ${e.to_state}  ${e.actor_type}:${e.agent_id}  ${e.note ?? ''}`,
      );
    }
    return task;
  },

  claim(flags) {
    if (!flags.agent) throw new Error('claim requiere --agent <agent_id>');
    const result = dispatch({
      agentId: flags.agent,
      missionId: flags.mission,
      autoStartImplementing: !flags['no-auto-start'],
      verifyWorktreeSubstrate: !flags['skip-substrate'],
      decisionEvidence:
        typeof flags.decisions === 'string' ? readJsonFlag(flags.decisions, '--decisions') : undefined,
    });
    console.log(JSON.stringify(result, null, 2));
    return result;
  },

  transition(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    if (!flags.to) throw new Error('transition requiere --to <ESTADO>');
    const task = transitionTask({
      taskId,
      to: flags.to,
      actor: actorFrom(flags),
      commit: typeof flags.commit === 'string' ? flags.commit : undefined,
      reason: typeof flags.reason === 'string' ? flags.reason : undefined,
      blockedReason: typeof flags['blocked-reason'] === 'string' ? flags['blocked-reason'] : undefined,
    });
    console.log(JSON.stringify(task, null, 2));
    return task;
  },

  block(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    if (typeof flags.reason !== 'string') throw new Error('block requiere --reason <texto>');
    const task = block({
      taskId,
      to: typeof flags.to === 'string' ? flags.to : 'BLOCKED',
      actor: actorFrom(flags),
      reason: flags.reason,
      blockedReason: typeof flags['blocked-reason'] === 'string' ? flags['blocked-reason'] : undefined,
    });
    console.log(JSON.stringify(task, null, 2));
    return task;
  },

  release(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    if (!flags.agent) throw new Error('release requiere --agent <agent_id>');
    const task = release({
      taskId,
      agentId: flags.agent,
      reason: typeof flags.reason === 'string' ? flags.reason : undefined,
    });
    console.log(JSON.stringify(task, null, 2));
    return task;
  },

  resume(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    if (!flags.human) {
      throw new Error(
        'resume exige --human <id>: salir de un estado BLOCKED* es un gate humano ' +
          '(arquitectura §3.3 regla 4, §13). El motor no puede desbloquearse solo.',
      );
    }
    const task = resume({
      taskId,
      actor: actorFrom(flags),
      reason: typeof flags.reason === 'string' ? flags.reason : undefined,
    });
    console.log(JSON.stringify(task, null, 2));
    return task;
  },

  validate(flags) {
    const queue = loadQueue();
    console.log(`queue.yaml: OK — ${queue.tasks.length} tarjeta(s)`);

    const substrate = verifySubstrate(
      typeof flags.worktree === 'string' ? flags.worktree : undefined,
      { agentRole: typeof flags.role === 'string' ? flags.role : undefined },
    );
    if (substrate.ok) {
      console.log(`sustrato: OK — ${substrate.checked.length} rutas verificadas`);
    } else {
      console.error(`sustrato: FALTA\n  - ${substrate.missing.join('\n  - ')}`);
      process.exitCode = 1;
    }

    const orphans = findRecoverableClaims();
    if (orphans.length > 0) {
      console.log(`locks candidatos a huérfanos (NO liberados): ${orphans.length}`);
      for (const o of orphans) console.log(`  ${o.lock.task_id}\t${o.status}\t${o.lock.agent_id}`);
    }
    return { queue, substrate, orphans };
  },

  /**
   * Designación HUMANA del dueño de una tarjeta `READY_FOR_QA` sin lock.
   *
   * Exige `--human`, `--reason` y `--confirmed`, igual que `resume`,
   * `resolve-recovery` y `resolve-migration-lock`: ningún agente adopta un
   * lock por su cuenta, y la adopción queda atribuida en el log.
   */
  adopt(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    if (!flags.human) {
      throw new Error(
        'adopt exige --human <id>: designar al dueño de una tarjeta sin lock es un gate ' +
          'humano. Ningún agente se declara implementador por su cuenta.',
      );
    }
    if (!flags.agent) throw new Error('adopt requiere --agent <implementer_id>');
    if (!flags.confirmed) {
      throw new Error('adopt exige --confirmed. Revisar antes la evidencia con `status <task_id>`.');
    }
    if (typeof flags.reason !== 'string') {
      throw new Error(
        'adopt exige --reason <texto>: por qué la tarjeta llegó a READY_FOR_QA sin lock.',
      );
    }

    const result = adoptQaLock({
      taskId,
      implementerId: flags.agent,
      adoptedBy: typeof flags.human === 'string' ? flags.human : 'HUMAN',
      reason: flags.reason,
      confirmed: true,
    });
    console.log(JSON.stringify(result.lock, null, 2));
    console.log(
      result.adopted
        ? `lock adoptado para "${flags.agent}". La tarjeta sigue en ${result.task.state}: adoptar no transiciona.`
        : `"${taskId}" ya tenía el lock de "${flags.agent}": nada que hacer.`,
    );
    return result;
  },

  /** El implementador entrega su evidencia; exige poseer el lock. */
  handoff(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    if (!flags.agent) throw new Error('handoff requiere --agent <implementer_id>');
    const result = submitHandoff({
      taskId,
      implementerId: flags.agent,
      handoff: readJsonFlag(flags.file, '--file'),
      auditorId: typeof flags.auditor === 'string' ? flags.auditor : null,
    });
    console.log(JSON.stringify(result.handoff, null, 2));
    return result;
  },

  /**
   * Auditoría independiente **persistente**: carga el estado, valida el
   * handoff entregado, valida la independencia del auditor y escribe la
   * entrada a QA, el resultado y la transición posterior.
   */
  qa(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    if (!flags.auditor) {
      throw new Error('qa requiere --auditor <auditor_id>, independiente del implementador');
    }
    const result = runQa({
      taskId,
      auditorId: flags.auditor,
      auditResult: readJsonFlag(flags.audit, '--audit'),
    });
    console.log(
      JSON.stringify(
        {
          state: result.state,
          qa_owner: result.auditorId,
          history: result.history.map((h) => ({ from: h.from, to: h.to })),
        },
        null,
        2,
      ),
    );
    return result;
  },

  readiness(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    const result = evaluateTaskReadiness({
      taskId,
      repoPath: typeof flags.repo === 'string' ? flags.repo : undefined,
      targetRef: typeof flags.target === 'string' ? flags.target : undefined,
      // Evidencia explícita de D-XXX (§10.4) — nunca derivada por el motor.
      // Sin --decisions, cualquier decision_refs declarado bloquea por
      // ausencia de evidencia, fail-closed.
      decisionEvidence:
        typeof flags.decisions === 'string' ? readJsonFlag(flags.decisions, '--decisions') : undefined,
    });
    console.log(JSON.stringify(result, null, 2));

    if (result.ready && flags.write) {
      const dir = manifestsDir();
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${taskId}.json`);
      fs.writeFileSync(file, `${JSON.stringify(result.manifest, null, 2)}\n`, 'utf8');
      console.log(`manifest escrito: ${file}`);
      console.log('El motor NO integra. La integración es un gate humano.');
    }
    return result;
  },

  /**
   * Resolución humana de una recuperación pendiente. Exige `--human`,
   * `--reason` y `--confirmed`: no hay forma de levantar el bloqueo por
   * omisión, y ninguna otra ruta del motor lo levanta como efecto lateral.
   */
  'resolve-recovery': (flags, positional) => {
    const taskId = requireTaskId(flags, positional);
    if (!flags.human) {
      throw new Error(
        'resolve-recovery exige --human <id>: la recuperación es un gate humano. ' +
          'El motor no se auto-repara.',
      );
    }
    if (!flags.confirmed) {
      throw new Error(
        'resolve-recovery exige --confirmed. Revisar antes la evidencia con `status <task_id>`.',
      );
    }
    if (typeof flags.reason !== 'string') {
      throw new Error('resolve-recovery exige --reason <texto>: por qué se considera resuelta.');
    }

    const result = resolveRecovery({
      taskId,
      resolvedBy: typeof flags.human === 'string' ? flags.human : 'HUMAN',
      reason: flags.reason,
      confirmed: true,
      disposition: typeof flags.disposition === 'string' ? flags.disposition : undefined,
    });
    console.log(JSON.stringify(result.resolution, null, 2));
    console.log(`evidencia archivada (no borrada): ${result.archived}`);
    console.log(`estado resultante: ${result.task.state}`);
    return result;
  },

  /** Sólo lectura: muestra el cerrojo de migración y si está vencido. */
  'migration-lock-status'() {
    const { status, lock } = classifyMigrationLock();
    console.log(JSON.stringify({ status, lock }, null, 2));
    if (status === 'STALE_HEARTBEAT' || status === 'TIMED_OUT') {
      console.log(
        'Cerrojo vencido, pero NO liberado automáticamente (arquitectura §9.5/§9.6). ' +
          'Resolver con `resolve-migration-lock --human <id> --reason <texto> --confirmed`.',
      );
    }
    return { status, lock };
  },

  /**
   * Resolución humana del cerrojo de migración. Igual que
   * `resolve-recovery`: exige `--human`, `--reason` y `--confirmed`. No hay
   * caducidad automática — un cerrojo vencido sigue bloqueando hasta que
   * una persona lo libera explícitamente, sepa o no de quién era.
   */
  'resolve-migration-lock': (flags) => {
    if (!flags.human) {
      throw new Error(
        'resolve-migration-lock exige --human <id>: liberar un cerrojo de migración es un ' +
          'gate humano. El motor no lo caduca ni lo libera por su cuenta.',
      );
    }
    if (!flags.confirmed) {
      throw new Error(
        'resolve-migration-lock exige --confirmed. Revisar antes con `migration-lock-status`.',
      );
    }
    if (typeof flags.reason !== 'string') {
      throw new Error('resolve-migration-lock exige --reason <texto>: por qué se libera.');
    }
    const before = classifyMigrationLock();
    if (!before.lock) throw new Error('No hay cerrojo de migración activo: nada que resolver.');

    releaseMigrationLock({ agentId: before.lock.agent_id, confirmed: true });
    console.log(
      `Cerrojo de migración de "${before.lock.task_id}" liberado por ${flags.human}: ${flags.reason}`,
    );
    return { released: before.lock, resolvedBy: flags.human, reason: flags.reason };
  },
};

export function run(argv) {
  const [command, ...rest] = argv;
  const handler = COMMANDS[command];
  if (!handler) {
    console.error(
      `Comando desconocido: ${command ?? '(ninguno)'}. Disponibles: ${Object.keys(COMMANDS).join(', ')}`,
    );
    process.exitCode = 1;
    return undefined;
  }
  const { flags, positional } = parseFlags(rest);
  return handler(flags, positional);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  try {
    run(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  }
}
