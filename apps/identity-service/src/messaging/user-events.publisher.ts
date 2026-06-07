import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import {
  RMQ_QUEUES,
  VERIDIT_EVENTS,
  type PasswordResetRequestedEvent,
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
    this.publishEvent(
      VERIDIT_EVENTS.userRegistered,
      event,
      'user registered event',
    );
  }

  publishPasswordResetRequested(event: PasswordResetRequestedEvent): void {
    this.publishEvent(
      VERIDIT_EVENTS.passwordResetRequested,
      event,
      'password reset requested event',
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  private publishEvent<T>(pattern: string, event: T, label: string): void {
    try {
      this.client.emit(pattern, event).subscribe({
        error: (error: unknown) => {
          this.logPublishError(label, error);
        },
      });
    } catch (error) {
      this.logPublishError(label, error);
    }
  }

  private logPublishError(label: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to publish ${label}: ${message}`);
  }
}
