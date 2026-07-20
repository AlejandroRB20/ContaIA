/**
 * Nombres de cookies de sesion — centralizados para que ningun modulo los
 * hardcodee por separado (EWO-002, seccion Seguridad).
 */
export const ACCESS_TOKEN_COOKIE = 'contaia_access_token';
export const REFRESH_TOKEN_COOKIE = 'contaia_refresh_token';
export const CSRF_TOKEN_COOKIE = 'contaia_csrf_token';
export const CSRF_TOKEN_HEADER = 'x-csrf-token';

/** El refresh token solo se envia al backend en las rutas que lo consumen. */
export const REFRESH_TOKEN_COOKIE_PATH = '/api/v1/auth';
