import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesGlob, matchesAny, checkWriteScope, globsOverlap } from '../lib/glob.mjs';

// --- 20. allowed_write con glob válido --------------------------------------

test('el defecto original: "apps/api/**" ahora SÍ casa archivos reales', () => {
  // Con la coincidencia exacta de Set de Claude-03 esto era `false`, y por
  // tanto todo archivo quedaba "fuera de alcance": el contrato era inusable.
  assert.equal(matchesGlob('apps/api/src/main.ts', 'apps/api/**'), true);
  assert.equal(matchesGlob('apps/api/src/deep/nested/file.ts', 'apps/api/**'), true);
});

test('* no cruza separadores de segmento; ** sí', () => {
  assert.equal(matchesGlob('docs/a.md', 'docs/*.md'), true);
  assert.equal(matchesGlob('docs/sub/a.md', 'docs/*.md'), false);
  assert.equal(matchesGlob('docs/sub/a.md', 'docs/**/*.md'), true);
  assert.equal(matchesGlob('docs/a.md', 'docs/**/*.md'), true, '**/ debe ser opcional');
});

test('? casa exactamente un carácter dentro del segmento', () => {
  assert.equal(matchesGlob('src/a1.ts', 'src/a?.ts'), true);
  assert.equal(matchesGlob('src/a12.ts', 'src/a?.ts'), false);
});

test('un patrón sin comodines que nombra un directorio cubre su contenido', () => {
  assert.equal(matchesGlob('packages/database/prisma/schema.prisma', 'packages/database'), true);
  assert.equal(matchesGlob('packages/databases/x.ts', 'packages/database'), false);
});

test('normaliza separadores de Windows', () => {
  assert.equal(matchesGlob('apps\\api\\src\\main.ts', 'apps/api/**'), true);
});

test('matchesAny con lista vacía es false (no autoriza nada)', () => {
  assert.equal(matchesAny('src/a.ts', []), false);
  assert.equal(matchesAny('src/a.ts', undefined), false);
});

// --- 21. forbidden_scope ----------------------------------------------------

test('forbidden_scope gana sobre allowed_write', () => {
  const scope = checkWriteScope(['packages/database/prisma/schema.prisma'], {
    allowedWrite: ['packages/**'],
    forbiddenScope: ['packages/database/prisma/**'],
  });
  assert.equal(scope.ok, false);
  assert.deepEqual(scope.forbidden, ['packages/database/prisma/schema.prisma']);
});

test('un archivo fuera de allowed_write se detecta', () => {
  const scope = checkWriteScope(['apps/web/src/x.tsx'], { allowedWrite: ['apps/api/**'] });
  assert.equal(scope.ok, false);
  assert.deepEqual(scope.outsideAllowed, ['apps/web/src/x.tsx']);
});

test('allowed_write ausente no autoriza nada (fail-closed)', () => {
  const scope = checkWriteScope(['src/a.ts'], {});
  assert.equal(scope.ok, false);
  assert.deepEqual(scope.outsideAllowed, ['src/a.ts']);
});

test('caso correcto: todo dentro de allowed_write y nada prohibido', () => {
  const scope = checkWriteScope(['apps/api/src/a.ts', 'apps/api/src/a.spec.ts'], {
    allowedWrite: ['apps/api/src/**'],
    forbiddenScope: ['packages/database/**'],
  });
  assert.equal(scope.ok, true);
  assert.deepEqual(scope.outsideAllowed, []);
  assert.deepEqual(scope.forbidden, []);
});

// --- 19. colisión de archivos (solape de globs) ------------------------------

test('globsOverlap detecta solape entre patrones distintos que cubren lo mismo', () => {
  assert.equal(globsOverlap(['apps/api/**'], ['apps/api/src/**']), true);
  assert.equal(globsOverlap(['apps/api/**'], ['apps/web/**']), false);
  assert.equal(globsOverlap(['docs/*.md'], ['docs/*.md']), true);
});

test('globsOverlap es conservador: ante duda, declara solape', () => {
  // Serializar de más es seguro; paralelizar de más no.
  assert.equal(globsOverlap(['apps/**'], ['apps/api/src/main.ts']), true);
});

test('listas vacías no se solapan con nada', () => {
  assert.equal(globsOverlap([], ['apps/api/**']), false);
  assert.equal(globsOverlap(undefined, undefined), false);
});
