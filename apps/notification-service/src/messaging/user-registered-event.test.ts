import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import {
  RMQ_QUEUES,
  VERIDIT_EVENTS,
  type UserRegisteredEvent,
} from '@veridit/contracts';
import { firstValueFrom } from 'rxjs';

interface NotificationRow {
  id: string;
  recipient: string;
  status: string;
  providerMessageId: string | null;
  sentAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
}

interface RabbitQueueInfo {
  consumers?: number;
  messages?: number;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for user registered event test`);
  }

  return value;
}

function getRabbitMqUrl(): string {
  return (
    process.env.RABBITMQ_URL?.trim() || 'amqp://guest:guest@localhost:5672'
  );
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    return '(masked)';
  }

  return `${localPart.slice(0, 1)}***@${domain}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function assertNotificationConsumer(): Promise<void> {
  const rabbitMqUrl = new URL(getRabbitMqUrl());
  const managementBase =
    process.env.RABBITMQ_MANAGEMENT_URL?.trim().replace(/\/$/, '') ||
    `http://${rabbitMqUrl.hostname}:15672`;
  const vhost = rabbitMqUrl.pathname.replace(/^\//, '') || '/';
  const queueUrl = `${managementBase}/api/queues/${encodeURIComponent(
    vhost,
  )}/${encodeURIComponent(RMQ_QUEUES.notifications)}`;
  const username = decodeURIComponent(rabbitMqUrl.username || 'guest');
  const password = decodeURIComponent(rabbitMqUrl.password || 'guest');
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');

  const response = await fetch(queueUrl, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `RabbitMQ management check failed with HTTP ${response.status}`,
    );
  }

  const queueInfo = (await response.json()) as RabbitQueueInfo;

  if (!queueInfo.consumers || queueInfo.consumers < 1) {
    throw new Error(
      `${RMQ_QUEUES.notifications} has no consumers; start notification-service before publishing the test event`,
    );
  }
}

async function publishUserRegisteredEvent(
  event: UserRegisteredEvent,
): Promise<void> {
  const client: ClientProxy = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: [getRabbitMqUrl()],
      queue: RMQ_QUEUES.notifications,
      queueOptions: {
        durable: true,
      },
    },
  });

  await client.connect();

  try {
    await firstValueFrom(client.emit(VERIDIT_EVENTS.userRegistered, event));
  } finally {
    await client.close();
  }
}

async function findNotification(
  client: Client,
  userId: string,
): Promise<NotificationRow | null> {
  const result = await client.query<NotificationRow>(
    `select id,
            recipient,
            status,
            "providerMessageId",
            "sentAt",
            "failedAt",
            "errorMessage"
       from "Notification"
      where "eventName" = $1
        and metadata->>'userId' = $2
      order by "createdAt" desc
      limit 1`,
    [VERIDIT_EVENTS.userRegistered, userId],
  );

  return result.rows[0] ?? null;
}

async function waitForSentNotification(
  client: Client,
  userId: string,
): Promise<NotificationRow> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const notification = await findNotification(client, userId);

    if (!notification) {
      await delay(1000);
      continue;
    }

    if (notification.status === 'FAILED') {
      throw new Error(
        `Notification failed: ${notification.errorMessage || 'unknown error'}`,
      );
    }

    if (notification.status === 'SENT') {
      if (!notification.providerMessageId || !notification.sentAt) {
        throw new Error('Notification reached SENT without delivery metadata');
      }

      return notification;
    }

    await delay(1000);
  }

  throw new Error('Timed out waiting for SENT notification');
}

async function main(): Promise<void> {
  const recipient = getRequiredEnv('SMTP_USER');
  const userId = `smtp-event-test-${randomUUID()}`;
  const event: UserRegisteredEvent = {
    userId,
    fullName: 'Teste SMTP Veridit',
    email: recipient,
    profile: 'COMMON_USER',
    occurredAt: new Date().toISOString(),
  };
  const database = new Client({
    connectionString: getRequiredEnv('DATABASE_URL'),
  });

  await assertNotificationConsumer();
  await publishUserRegisteredEvent(event);

  await database.connect();

  try {
    const notification = await waitForSentNotification(database, userId);

    console.log(`User registered event published: ${event.userId}`);
    console.log(`Notification ${notification.id} reached SENT`);
    console.log(`Welcome email sent to ${maskEmail(notification.recipient)}`);
    console.log(`Provider message id: ${notification.providerMessageId}`);
  } finally {
    await database.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
