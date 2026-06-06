import { Module } from '@nestjs/common';
import { createSmtpTransport, getEmailFrom } from './smtp-email.config';
import { EMAIL_FROM, EMAIL_PROVIDER, EMAIL_TRANSPORT } from './email.tokens';
import { SmtpEmailProvider } from './smtp-email.provider';

@Module({
  providers: [
    {
      provide: EMAIL_TRANSPORT,
      useFactory: createSmtpTransport,
    },
    {
      provide: EMAIL_FROM,
      useFactory: getEmailFrom,
    },
    {
      provide: EMAIL_PROVIDER,
      useClass: SmtpEmailProvider,
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
