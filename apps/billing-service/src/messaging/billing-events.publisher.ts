import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import {
  RMQ_QUEUES,
  VERIDIT_EVENTS,
  type CreditPurchaseCreatedEvent,
} from '@veridit/contracts';

@Injectable()
export class BillingEventsPublisher implements OnModuleDestroy {
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

  publishCreditPurchased(event: CreditPurchaseCreatedEvent): void {
    this.client.emit(VERIDIT_EVENTS.creditPurchased, event).subscribe({
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to publish credit purchase event: ${message}`);
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
