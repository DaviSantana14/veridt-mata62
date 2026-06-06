import { Injectable, OnModuleDestroy } from '@nestjs/common';
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

@Injectable()
export class UserEventsPublisher implements OnModuleDestroy {
  private readonly client: ClientProxy = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      queue: RMQ_QUEUES.notifications,
      queueOptions: {
        durable: true,
      },
    },
  });

  publishUserRegistered(event: UserRegisteredEvent): void {
    try {
      this.client.emit(VERIDIT_EVENTS.userRegistered, event).subscribe({
        error: (error: unknown) => {
          this.logPublishError(error);
        },
      });
    } catch (error) {
      this.logPublishError(error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  private logPublishError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to publish user registered event: ${message}`);
  }
}
