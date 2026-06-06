import { Inject, Injectable } from '@nestjs/common';
import {
  VERIDIT_EVENTS,
  type CreditPurchaseCreatedEvent,
  type HealthResponse,
} from '@veridit/contracts';
import { EMAIL_PROVIDER } from './email/email.tokens';
import type { EmailProvider } from './email/email.types';
import { PrismaService } from './prisma/prisma.service';

export interface NotificationResponse {
  id: string;
  recipient: string;
  status: string;
  createdAt: string;
}

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
  ) {}

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
    const subject = 'Compra de creditos Veridit confirmada';
    const body = `Compra ${event.purchaseId} confirmou ${event.credits} creditos para o pacote ${event.packageName}.`;
    const notification = await this.prisma.notification.create({
      data: {
        recipient: event.payerEmail,
        subject,
        body,
        eventName: VERIDIT_EVENTS.creditPurchased,
        status: 'PENDING',
        metadata: {
          purchaseId: event.purchaseId,
          userId: event.userId,
          packageName: event.packageName,
        },
      },
    });

    let providerMessageId: string | undefined;

    try {
      const result = await this.emailProvider.sendEmail({
        to: event.payerEmail,
        subject,
        text: body,
        html: '<p>Sua compra de creditos Veridit foi confirmada.</p>',
      });

      providerMessageId = result.messageId;
    } catch (error) {
      const failedNotification = await this.prisma.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      return this.toNotificationResponse(failedNotification);
    }

    const sentNotification = await this.prisma.notification.update({
      where: {
        id: notification.id,
      },
      data: {
        status: 'SENT',
        providerMessageId,
        sentAt: new Date(),
      },
    });

    return this.toNotificationResponse(sentNotification);
  }

  private toNotificationResponse(notification: {
    id: string;
    recipient: string;
    status: string;
    createdAt: Date;
  }): NotificationResponse {
    return {
      id: notification.id,
      recipient: notification.recipient,
      status: notification.status,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
