export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
