import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import {
  RMQ_QUEUES,
  VERIDIT_EVENTS,
  type CaptureCompletedEvent,
} from '@veridit/contracts';

@Injectable()
export class CaptureEventsPublisher implements OnModuleDestroy {
  private readonly reportsClient: ClientProxy = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      queue: RMQ_QUEUES.reports,
      queueOptions: {
        durable: true,
      },
    },
  });

  private readonly notificationsClient: ClientProxy = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      queue: RMQ_QUEUES.notifications,
      queueOptions: {
        durable: true,
      },
    },
  });

  publishCaptureCompleted(event: CaptureCompletedEvent): void {
    this.emitCaptureCompleted(this.reportsClient, 'reports', event);
    this.emitCaptureCompleted(this.notificationsClient, 'notifications', event);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.reportsClient.close(),
      this.notificationsClient.close(),
    ]);
  }

  private emitCaptureCompleted(
    client: ClientProxy,
    queueName: 'reports' | 'notifications',
    event: CaptureCompletedEvent,
  ): void {
    client.emit(VERIDIT_EVENTS.captureCompleted, event).subscribe({
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to publish capture completed event to ${queueName}: ${message}`,
        );
      },
    });
  }
}
