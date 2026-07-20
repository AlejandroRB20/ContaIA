import { Injectable, Logger } from '@nestjs/common';

import type { EmailMessage, EmailSender } from './email-sender.interface';

/**
 * El envio real de correo esta fuera del MVP
 * (docs/11_SECURITY_ARCHITECTURE.md seccion 20: "Correo | Fuera del MVP").
 * Esta implementacion registra el correo simulado en el logger de la
 * aplicacion (nunca en la respuesta HTTP) para que el flujo de verificacion
 * de correo / reset de contraseña / invitaciones sea probable de extremo a
 * extremo en desarrollo. Se reemplaza por un proveedor real (SMTP/API)
 * cuando el modulo de Notificaciones entre en alcance.
 */
@Injectable()
export class LoggingEmailSender implements EmailSender {
  private readonly logger = new Logger('EmailSender (simulado)');

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(`Para: ${message.to} | Asunto: ${message.subject}\n${message.body}`);
    await Promise.resolve();
  }
}
