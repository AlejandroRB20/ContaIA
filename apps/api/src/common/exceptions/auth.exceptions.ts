import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';

/**
 * Excepciones de dominio de Auth — todas extienden las clases de NestJS
 * para que el filtro global (`all-exceptions.filter.ts`) las traduzca
 * automaticamente al codigo/estado exacto de docs/08_API_DESIGN.md
 * (seccion 11), sin exponer detalle interno (BR-SEC-003, BR-ERR-002).
 * Los mensajes son deliberadamente genericos donde previenen enumeracion
 * de cuentas (docs/11_SECURITY_ARCHITECTURE.md seccion 6).
 */

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Correo o contraseña incorrectos.');
  }
}

export class AccountNotVerifiedException extends UnauthorizedException {
  constructor() {
    super('Debes verificar tu correo electrónico antes de continuar.');
  }
}

export class AccountNotActiveException extends UnauthorizedException {
  constructor() {
    super('Esta cuenta no está disponible.');
  }
}

export class InvalidMfaCodeException extends UnauthorizedException {
  constructor() {
    super('El código de verificación no es válido.');
  }
}

export class InvalidOrExpiredTokenException extends UnauthorizedException {
  constructor() {
    super('El enlace o token ya no es válido. Solicita uno nuevo.');
  }
}

export class SessionRevokedException extends UnauthorizedException {
  constructor() {
    super('Tu sesión ha expirado. Inicia sesión de nuevo.');
  }
}

export class InsufficientPermissionException extends ForbiddenException {
  constructor() {
    super('No tienes permiso para realizar esta acción.');
  }
}

export class MembershipNotFoundException extends ForbiddenException {
  constructor() {
    super('No tienes acceso a esta empresa.');
  }
}

export class EmailAlreadyRegisteredException extends ConflictException {
  constructor() {
    super('Ya existe una cuenta con este correo electrónico.');
  }
}

export class MembershipVersionConflictException extends ConflictException {
  constructor() {
    super('Este registro fue modificado por otra persona. Recarga e intenta de nuevo.');
  }
}

export class CompanyVersionConflictException extends ConflictException {
  constructor() {
    super('Esta empresa fue modificada por otra persona. Recarga e intenta de nuevo.');
  }
}

/** BR-EMP-001 (invariante permanente): toda Empresa conserva al menos un Administrador propietario. */
export class LastOwnerException extends ConflictException {
  constructor() {
    super('No puedes revocar al único propietario de la empresa. Asigna otro propietario primero.');
  }
}
