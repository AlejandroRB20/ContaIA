import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './paths.mjs';

/**
 * Verificación del sustrato de gobierno en un worktree.
 *
 * Contrato fijado en `LOOP-000_GOVERNANCE_SUBSTRATE.md` §5 y diferido
 * explícitamente a `LOOP-001` en §13.4:
 *
 *   > Es una comprobación de existencia de archivos, no un instalador: no
 *   > copia, no genera, no repara. Si falla, la tarjeta se bloquea y lo
 *   > reporta.
 *
 * **Fail-closed sin excepción.** Un worktree sin `.claude/settings.json` no
 * tiene el `deny` de `git merge`/`git reset --hard`/`git clean`; un worktree
 * sin `.claude/rules/` no tiene las reglas de gobierno. Ejecutar un agente
 * autónomo ahí sería automatizar sin barreras — el hallazgo `CRÍTICO`
 * original de la arquitectura §2.1.
 *
 * Git entrega el sustrato a cada worktree porque `LOOP-000` lo versionó.
 * Si falta, el remedio es de Git (rama equivocada, base anterior a
 * `LOOP-000`), nunca copiar archivos a mano.
 */

/** Rutas exigidas siempre, relativas a la raíz del worktree. */
export const REQUIRED_SUBSTRATE = Object.freeze([
  'CLAUDE.md',
  'AI_PLAYBOOK.md',
  '.claude/settings.json',
  '.claude/rules/00-governance.md',
  '.claude/rules/10-multitenancy-security.md',
  '.claude/rules/20-fiscal-data-safety.md',
  '.claude/rules/30-quality-scope.md',
  '.claude/rules/40-parallel-work.md',
]);

/** Directorios que además deben existir y no estar vacíos. */
export const REQUIRED_SUBSTRATE_DIRS = Object.freeze(['.claude/rules', '.claude/agents']);

export class SubstrateMissingError extends Error {
  constructor(worktreePath, missing) {
    super(
      `Sustrato de gobierno incompleto en "${worktreePath}". Faltan:\n  - ${missing.join('\n  - ')}\n` +
        'El motor NO copia ni regenera gobierno: corrige la base del worktree en Git.',
    );
    this.name = 'SubstrateMissingError';
    this.code = 'SUBSTRATE_MISSING';
    this.blocked_reason = 'substrate_missing';
    this.missing = missing;
  }
}

/**
 * @param {string} [worktreePath] raíz a verificar; por defecto la del repo
 * @param {{agentRole?: string}} [options] si se indica, exige también
 *        `.claude/agents/<agentRole>.md` (arquitectura §5)
 * @returns {{ok: boolean, missing: string[], checked: string[]}}
 */
export function verifySubstrate(worktreePath = repoRoot(), { agentRole } = {}) {
  const required = [...REQUIRED_SUBSTRATE];
  if (agentRole) required.push(`.claude/agents/${agentRole}.md`);

  const missing = [];

  for (const relative of required) {
    const target = path.join(worktreePath, relative);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      missing.push(relative);
    }
  }

  for (const relative of REQUIRED_SUBSTRATE_DIRS) {
    const target = path.join(worktreePath, relative);
    if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
      missing.push(`${relative}/ (directorio)`);
      continue;
    }
    if (fs.readdirSync(target).length === 0) {
      missing.push(`${relative}/ (vacío)`);
    }
  }

  return { ok: missing.length === 0, missing, checked: required };
}

/** Igual que `verifySubstrate` pero lanza `SubstrateMissingError`. */
export function assertSubstrate(worktreePath = repoRoot(), options = {}) {
  const result = verifySubstrate(worktreePath, options);
  if (!result.ok) throw new SubstrateMissingError(worktreePath, result.missing);
  return result;
}
