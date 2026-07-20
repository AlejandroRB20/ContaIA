#!/usr/bin/env node
/**
 * Ejecuta ESLint sobre los archivos preparados (staged) agrupandolos por
 * workspace del monorepo.
 *
 * Necesario porque cada paquete de ContaIA tiene su propia configuracion
 * plana de ESLint (`eslint.config.mjs` por paquete) y NO existe un
 * `eslint.config.*` en la raiz; ademas `eslint` no es una dependencia de la
 * raiz, por lo que `eslint` no se resuelve desde `./node_modules/.bin`. Correr
 * `eslint` directamente desde la raiz (como hacia la configuracion original de
 * lint-staged) fallaba siempre — esa es la razon por la que el hook
 * `pre-commit` nunca habia funcionado.
 *
 * lint-staged pasa las rutas de archivo como argumentos; aqui se agrupan por
 * workspace y se corre `pnpm --filter "./<workspace>" exec eslint --fix` en
 * cada grupo, de modo que cada archivo se valida con la configuracion de su
 * propio paquete. Si ESLint encuentra un error no corregible, el proceso
 * termina con codigo distinto de cero y el commit falla (comportamiento
 * deseado del hook).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = process.argv.slice(2);

/**
 * Un workspace se lintea solo si tiene su propia configuracion plana de
 * ESLint. Los paquetes que NO la tienen (`packages/eslint-config`,
 * `packages/typescript-config`) no se lintean en ninguna parte del monorepo
 * (`turbo run lint` tampoco los cubre) — se omiten aqui igual.
 */
function hasEslintConfig(workspace) {
  return ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs'].some((name) =>
    existsSync(path.join(root, workspace, name)),
  );
}

const byWorkspace = new Map();
for (const file of files) {
  const absolute = path.resolve(root, file);
  const relative = path.relative(root, absolute).split(path.sep).join('/');
  const segments = relative.split('/');
  const isWorkspaceFile =
    (segments[0] === 'apps' || segments[0] === 'packages') && segments.length > 2;
  if (!isWorkspaceFile) {
    // Archivos en la raiz (sin workspace propio) no tienen configuracion de
    // ESLint — se omiten deliberadamente.
    continue;
  }
  const workspace = `${segments[0]}/${segments[1]}`;
  if (!byWorkspace.has(workspace)) {
    byWorkspace.set(workspace, []);
  }
  // Se pasa la ruta ABSOLUTA a ESLint: cada grupo corre con cwd = directorio
  // del workspace (por `pnpm --filter`), asi que una ruta relativa a la raiz
  // no se resolveria; la absoluta funciona desde cualquier cwd y ESLint
  // aplica la configuracion plana del propio workspace.
  byWorkspace.get(workspace).push(absolute);
}

// Se procesa en lotes para no exceder el limite de longitud de linea de
// comandos de Windows cuando se preparan muchos archivos a la vez (por
// ejemplo, en el primer commit del repositorio).
const BATCH_SIZE = 40;

for (const [workspace, workspaceFiles] of byWorkspace) {
  if (!hasEslintConfig(workspace)) {
    continue;
  }
  for (let index = 0; index < workspaceFiles.length; index += BATCH_SIZE) {
    const batch = workspaceFiles.slice(index, index + BATCH_SIZE);
    const result = spawnSync(
      'pnpm',
      ['--filter', `./${workspace}`, 'exec', 'eslint', '--fix', '--no-warn-ignored', ...batch],
      { stdio: 'inherit', cwd: root, shell: true },
    );
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}
