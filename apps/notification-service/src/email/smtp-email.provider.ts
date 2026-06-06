import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_FROM, EMAIL_TRANSPORT } from './email.tokens';
import type {
  EmailProvider,
  EmailSendResult,
  EmailTransport,
  SendEmailInput,
} from './email.types';

export type { EmailTransport };

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  constructor(
    @Inject(EMAIL_TRANSPORT)
    private readonly transport: EmailTransport,
    @Inject(EMAIL_FROM)
    private readonly from: string,
  ) {}

  async sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
    const result = await this.transport.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return {
      messageId: result.messageId,
    };
  }
}
