export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSendResult {
  messageId?: string;
}

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<EmailSendResult>;
}

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailTransport {
  sendMail(message: EmailMessage): Promise<EmailSendResult>;
}
