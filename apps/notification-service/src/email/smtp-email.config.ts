import nodemailer from 'nodemailer';
import type { EmailTransport } from './email.types';

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for notification-service email`);
  }

  return value;
}

function getSmtpPort(): number {
  const value = getRequiredEnv('SMTP_PORT');
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a positive integer');
  }

  return port;
}

function getSmtpSecure(): boolean {
  return process.env.SMTP_SECURE?.trim().toLowerCase() === 'true';
}

export function getEmailFrom(): string {
  return getRequiredEnv('EMAIL_FROM');
}

export function createSmtpTransport(): EmailTransport {
  const transport = nodemailer.createTransport({
    host: getRequiredEnv('SMTP_HOST'),
    port: getSmtpPort(),
    secure: getSmtpSecure(),
    auth: {
      user: getRequiredEnv('SMTP_USER'),
      pass: getRequiredEnv('SMTP_PASS'),
    },
  });

  return transport;
}
