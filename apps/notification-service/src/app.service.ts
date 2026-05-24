import { Injectable } from '@nestjs/common';
import {
  VERIDIT_EVENTS,
  type CreditPurchaseCreatedEvent,
  type HealthResponse,
} from '@veridit/contracts';
import { PrismaService } from './prisma/prisma.service';

export interface NotificationResponse {
  id: string;
  recipient: string;
  status: string;
  createdAt: string;
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth(): HealthResponse {
    return {
      service: 'notification-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async createCreditPurchaseEmail(
    event: CreditPurchaseCreatedEvent,
  ): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        recipient: event.payerEmail,
        subject: 'Compra de creditos Veridit confirmada',
        body: `Compra mock ${event.purchaseId} confirmou ${event.credits} creditos.`,
        eventName: VERIDIT_EVENTS.creditPurchased,
        metadata: {
          purchaseId: event.purchaseId,
          userId: event.userId,
          packageName: event.packageName,
        },
      },
    });

    return {
      id: notification.id,
      recipient: notification.recipient,
      status: notification.status,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
