import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'contaia_access_token';

/**
 * Rutas publicas — el resto exige sesion (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md
 * seccion 11). La pagina tecnica de estado de EWO-001 (`/`) tambien es
 * publica: no expone datos de negocio.
 *
 * `/demo` es la vista previa visual del panel financiero (EWO-frontend-ui-02):
 * datos ficticios, sin sesion real detras. Se declara publica unicamente
 * para que la vista previa sea navegable sin la cookie de sesion real — no
 * cambia ninguna regla de autenticacion ni autorizacion de la aplicacion
 * productiva.
 */
const PUBLIC_PATH_PREFIXES = [
  '/acceso',
  '/no-autorizado',
  '/prohibido',
  '/sesion-expirada',
  '/demo',
];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') {
    return true;
  }
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Verifica UNICAMENTE la presencia de la cookie de sesion — una
 * optimizacion de UX para redirigir rapido, nunca la barrera de seguridad
 * real. La validacion completa (firma, expiracion, revocacion) ocurre
 * siempre en `AuthenticationGuard` del backend
 * (docs/19_FRONTEND_IMPLEMENTATION_PLAN.md seccion 11: "la interfaz nunca
 * sustituye la autorizacion real del servidor").
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.has(ACCESS_TOKEN_COOKIE);
  if (!hasSessionCookie) {
    const loginUrl = new URL('/acceso/iniciar-sesion', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
