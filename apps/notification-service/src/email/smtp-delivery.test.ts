import 'dotenv/config';
import { createSmtpTransport, getEmailFrom } from './smtp-email.config';
import type { EmailTransport } from './email.types';

interface VerifiableEmailTransport extends EmailTransport {
  verify(): Promise<boolean>;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for SMTP delivery test`);
  }

  return value;
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    return '(masked)';
  }

  return `${localPart.slice(0, 1)}***@${domain}`;
}

async function main(): Promise<void> {
  const recipient =
    process.env.EMAIL_TEST_TO?.trim() || getRequiredEnv('SMTP_USER');
  const transport = createSmtpTransport() as VerifiableEmailTransport;

  await transport.verify();

  const result = await transport.sendMail({
    from: getEmailFrom(),
    to: recipient,
    subject: '[Veridit] Teste SMTP',
    text: 'Teste real de envio SMTP do notification-service.',
    html: '<p>Teste real de envio SMTP do notification-service.</p>',
  });

  console.log(`SMTP verify: OK`);
  console.log(`Test email sent to ${maskEmail(recipient)}`);

  if (result.messageId) {
    console.log(`Provider message id: ${result.messageId}`);
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
