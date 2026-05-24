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
  private readonly client: ClientProxy = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      queue: RMQ_QUEUES.reports,
      queueOptions: {
        durable: true,
      },
    },
  });

  publishCaptureCompleted(event: CaptureCompletedEvent): void {
    this.client.emit(VERIDIT_EVENTS.captureCompleted, event).subscribe({
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to publish capture completed event: ${message}`);
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
