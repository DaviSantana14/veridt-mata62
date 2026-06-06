import { strict as assert } from 'node:assert';
import { SmtpEmailProvider, type EmailTransport } from './smtp-email.provider';

async function sendsEmailThroughConfiguredTransport(): Promise<void> {
  const sentMessages: unknown[] = [];
  const transport: EmailTransport = {
    sendMail(message) {
      sentMessages.push(message);
      return Promise.resolve({ messageId: 'gmail-message-123' });
    },
  };

  const provider = new SmtpEmailProvider(
    transport,
    'Veridit <sender@gmail.com>',
  );

  const result = await provider.sendEmail({
    to: 'recipient@example.com',
    subject: 'Compra de creditos Veridit confirmada',
    text: 'Sua compra foi confirmada.',
    html: '<p>Sua compra foi confirmada.</p>',
  });

  assert.deepEqual(sentMessages, [
    {
      from: 'Veridit <sender@gmail.com>',
      to: 'recipient@example.com',
      subject: 'Compra de creditos Veridit confirmada',
      text: 'Sua compra foi confirmada.',
      html: '<p>Sua compra foi confirmada.</p>',
    },
  ]);
  assert.equal(result.messageId, 'gmail-message-123');
}

async function main(): Promise<void> {
  await sendsEmailThroughConfiguredTransport();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
