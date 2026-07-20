/**
 * Variables de entorno requeridas por `loadServerConfig()` (EWO-002:
 * JWT_ACCESS_SECRET, MFA_ENCRYPTION_KEY, CSRF_SECRET no tienen valor por
 * defecto — a proposito, para que ningun ambiente real dependa de un
 * secreto conocido). Se fijan aqui solo para que las suites de Jest de
 * apps/api puedan arrancar `AppModule` sin depender de que quien invoque
 * `pnpm test` las haya exportado manualmente. Nunca se usan estos valores
 * fuera de pruebas.
 */
process.env.JWT_ACCESS_SECRET ??= 'test_only_jwt_access_secret_32_characters_min';
process.env.MFA_ENCRYPTION_KEY ??= 'test_only_mfa_encryption_key_32_characters_min';
process.env.CSRF_SECRET ??= 'test_only_csrf_secret_32_characters_minimum';
process.env.DATABASE_URL ??= 'postgresql://contaia:contaia_dev_only@localhost:5432/contaia';
process.env.REDIS_ENABLED ??= 'false';
