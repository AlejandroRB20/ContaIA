/**
 * Conventional Commits (docs/25_DEVOPS.md, EWO-001 seccion 13).
 * Extension .cjs explicita: el root del monorepo no fija "type": "module",
 * pero se declara sin ambiguedad para que Commitlint lo cargue igual en
 * cualquier configuracion futura.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
};
