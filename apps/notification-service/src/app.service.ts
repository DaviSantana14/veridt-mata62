import { Inject, Injectable } from '@nestjs/common';
import {
  VERIDIT_EVENTS,
  type CreditPurchaseCreatedEvent,
  type HealthResponse,
  type UserRegisteredEvent,
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

interface CreateEmailNotificationInput {
  recipient: string;
  subject: string;
  body: string;
  html: string;
  eventName: string;
  metadata: Record<string, string | number | boolean | null>;
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

    return this.createEmailNotification({
      recipient: event.payerEmail,
      subject,
      body,
      html: '<p>Sua compra de creditos Veridit foi confirmada.</p>',
      eventName: VERIDIT_EVENTS.creditPurchased,
      metadata: {
        purchaseId: event.purchaseId,
        userId: event.userId,
        packageName: event.packageName,
      },
    });
  }

  async createUserRegisteredEmail(
    event: UserRegisteredEvent,
  ): Promise<NotificationResponse> {
    const subject = 'Bem-vindo ao Veridit';
    const body = `Ola ${event.fullName}, sua conta Veridit foi criada com sucesso.`;

    return this.createEmailNotification({
      recipient: event.email,
      subject,
      body,
      html: `<p>Ola ${event.fullName}, sua conta Veridit foi criada com sucesso.</p>`,
      eventName: VERIDIT_EVENTS.userRegistered,
      metadata: {
        userId: event.userId,
        profile: event.profile,
      },
    });
  }

  private async createEmailNotification(
    input: CreateEmailNotificationInput,
  ): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        recipient: input.recipient,
        subject: input.subject,
        body: input.body,
        eventName: input.eventName,
        status: 'PENDING',
        metadata: input.metadata,
      },
    });

    let providerMessageId: string | undefined;

    try {
      const result = await this.emailProvider.sendEmail({
        to: input.recipient,
        subject: input.subject,
        text: input.body,
        html: input.html,
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
