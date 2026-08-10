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
 *   qa         registra el resultado de una auditoría independiente
 *   readiness  evalúa READY_FOR_INTEGRATION y genera el manifest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQueue } from './lib/queue.mjs';
import { listTasks, getOrCreateTaskState } from './lib/store.mjs';
import { dispatch, transitionTask, block, release, resume } from './lib/dispatcher.mjs';
import { eventsForTask } from './lib/events.mjs';
import { verifySubstrate } from './lib/substrate.mjs';
import { inspectTask, findRecoverableClaims } from './lib/recovery.mjs';
import { validateHandoff, validateAuditResult } from './lib/qa-contract.mjs';
import { createLoopState, beginQa, submitQaResult } from './lib/qa-loop.mjs';
import { evaluateIntegrationReadiness } from './lib/integration-readiness.mjs';
import { manifestsDir } from './lib/paths.mjs';

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
      console.log(
        `${t.task_id}\t${t.state}\t${t.risk_class}\towner=${t.owner ?? '-'}\t${t.title}`,
      );
    }
    return filtered;
  },

  status(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    const task = getOrCreateTaskState(taskId);
    console.log(JSON.stringify(task, null, 2));
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

  qa(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    const handoff = readJsonFlag(flags.handoff, '--handoff');
    const audit = readJsonFlag(flags.audit, '--audit');

    const handoffCheck = validateHandoff(handoff);
    if (!handoffCheck.valid) throw new Error(`handoff inválido:\n  - ${handoffCheck.errors.join('\n  - ')}`);
    const auditCheck = validateAuditResult(audit);
    if (!auditCheck.valid) throw new Error(`auditResult inválido:\n  - ${auditCheck.errors.join('\n  - ')}`);

    const task = getOrCreateTaskState(taskId);
    const loop = submitQaResult(beginQa(createLoopState(taskId, handoff, task)), audit);
    console.log(JSON.stringify({ state: loop.state, history: loop.history }, null, 2));
    return loop;
  },

  readiness(flags, positional) {
    const taskId = requireTaskId(flags, positional);
    const handoff = readJsonFlag(flags.handoff, '--handoff');
    const audit = readJsonFlag(flags.audit, '--audit');
    const task = getOrCreateTaskState(taskId);

    const result = evaluateIntegrationReadiness(handoff, audit, task);
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
