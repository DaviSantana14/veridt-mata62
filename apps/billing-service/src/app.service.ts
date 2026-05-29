import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  type CreateCreditPurchaseResponse,
  type CreditPackageResponse,
  type HealthResponse,
  type PurchaseCreditsRequest,
} from '@veridit/contracts';
import {
  CreditPackageName,
  type CreditPurchase,
} from './generated/prisma/client';
import { BillingEventsPublisher } from './messaging/billing-events.publisher';
import { PAYMENT_PROVIDER } from './payments/payment-provider.interface';
import { PrismaService } from './prisma/prisma.service';

type PackageDefinition = CreditPackageResponse & {
  schemaName: CreditPackageName;
};

type CheckoutPreference = {
  providerPreferenceId: string;
  checkoutUrl: string;
};

type PaymentProviderPort = {
  createCheckoutPreference(
    input: PurchaseCreditsRequest & {
      purchaseId: string;
      idempotencyKey: string;
      amountInCents: number;
      credits: number;
    },
  ): Promise<CheckoutPreference>;
  findCheckoutPreferenceByPurchaseId(
    purchaseId: string,
  ): Promise<CheckoutPreference | null>;
  getPayment(paymentId: string): Promise<{
    providerPaymentId: string;
    status: string;
    externalReference?: string;
    approvedAt?: Date;
  }>;
};

export type MockPurchaseResponse = PurchaseCreditsRequest & {
  purchaseId: string;
  status: string;
};

export type MercadoPagoWebhookPayload = {
  action?: string;
  api_version?: string;
  data?: {
    id?: string | number;
  };
  date_created?: string;
  id?: string | number;
  live_mode?: boolean;
  topic?: string;
  type?: string;
  user_id?: string | number;
};

export type MercadoPagoWebhookResponse = {
  received: boolean;
  processed: boolean;
  status?: string;
};

const PACKAGE_DEFINITIONS: Record<
  PurchaseCreditsRequest['packageName'],
  PackageDefinition
> = {
  basic: {
    id: 'basic',
    name: 'basic',
    schemaName: CreditPackageName.BASIC,
    credits: 10,
    pricePerCreditInCents: 500,
    benefits: 'Pacote inicial para registros pontuais.',
  },
  medium: {
    id: 'medium',
    name: 'medium',
    schemaName: CreditPackageName.MEDIUM,
    credits: 30,
    pricePerCreditInCents: 450,
    benefits: 'Pacote intermediario para uso recorrente.',
  },
  premium: {
    id: 'premium',
    name: 'premium',
    schemaName: CreditPackageName.PREMIUM,
    credits: 80,
    pricePerCreditInCents: 400,
    benefits: 'Pacote premium para alto volume de registros.',
  },
};

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsPublisher: BillingEventsPublisher,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProviderPort,
  ) {}

  getHealth(): HealthResponse {
    return {
      service: 'billing-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  getPackages(): CreditPackageResponse[] {
    return Object.values(PACKAGE_DEFINITIONS).map((creditPackage) => ({
      id: creditPackage.id,
      name: creditPackage.name,
      credits: creditPackage.credits,
      pricePerCreditInCents: creditPackage.pricePerCreditInCents,
      benefits: creditPackage.benefits,
    }));
  }

  async createMockPurchase(
    body: PurchaseCreditsRequest,
  ): Promise<MockPurchaseResponse> {
    const selectedPackage = PACKAGE_DEFINITIONS[body.packageName];
    const amountInCents =
      selectedPackage.credits * selectedPackage.pricePerCreditInCents;

    const creditPackage = await this.upsertCreditPackage(selectedPackage);

    const purchase = await this.prisma.creditPurchase.create({
      data: {
        userId: body.userId,
        packageId: creditPackage.id,
        packageName: selectedPackage.schemaName,
        credits: selectedPackage.credits,
        amountInCents,
        payerEmail: body.payerEmail,
        status: 'PAID',
      },
    });

    await this.prisma.userCreditBalance.upsert({
      where: {
        userId: body.userId,
      },
      create: {
        userId: body.userId,
        credits: selectedPackage.credits,
      },
      update: {
        credits: {
          increment: selectedPackage.credits,
        },
      },
    });

    this.eventsPublisher.publishCreditPurchased({
      purchaseId: purchase.id,
      userId: body.userId,
      packageName: body.packageName,
      credits: selectedPackage.credits,
      payerEmail: body.payerEmail,
      occurredAt: purchase.createdAt.toISOString(),
    });

    return {
      purchaseId: purchase.id,
      userId: body.userId,
      packageName: body.packageName,
      payerEmail: body.payerEmail,
      status: purchase.status,
    };
  }

  async createCreditPurchase(
    body: PurchaseCreditsRequest,
    idempotencyKey: string,
  ): Promise<CreateCreditPurchaseResponse> {
    const normalizedIdempotencyKey =
      this.normalizeIdempotencyKey(idempotencyKey);
    const existingPurchase = await this.prisma.creditPurchase.findUnique({
      where: {
        idempotencyKey: normalizedIdempotencyKey,
      },
    });

    if (existingPurchase) {
      this.assertSameIdempotentPurchase(existingPurchase, body);
      return this.toCreateCreditPurchaseResponse(
        existingPurchase,
        normalizedIdempotencyKey,
      );
    }

    const selectedPackage = PACKAGE_DEFINITIONS[body.packageName];
    const amountInCents =
      selectedPackage.credits * selectedPackage.pricePerCreditInCents;
    const creditPackage = await this.upsertCreditPackage(selectedPackage);

    let purchase: CreditPurchase;

    try {
      purchase = await this.createPendingPurchase({
        userId: body.userId,
        packageId: creditPackage.id,
        packageName: selectedPackage.schemaName,
        credits: selectedPackage.credits,
        amountInCents,
        payerEmail: body.payerEmail,
        idempotencyKey: normalizedIdempotencyKey,
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const duplicatedPurchase = await this.prisma.creditPurchase.findUnique({
        where: {
          idempotencyKey: normalizedIdempotencyKey,
        },
      });

      if (!duplicatedPurchase) {
        throw error;
      }

      this.assertSameIdempotentPurchase(duplicatedPurchase, body);
      return this.toCreateCreditPurchaseResponse(
        duplicatedPurchase,
        normalizedIdempotencyKey,
      );
    }

    return this.createAndPersistCheckout(purchase, normalizedIdempotencyKey);
  }

  async handleMercadoPagoWebhook(
    payload: MercadoPagoWebhookPayload,
  ): Promise<MercadoPagoWebhookResponse> {
    if (!this.isPaymentNotification(payload)) {
      return {
        received: true,
        processed: false,
      };
    }

    const paymentId = this.extractPaymentId(payload);

    if (!paymentId) {
      return {
        received: true,
        processed: false,
      };
    }

    const payment = await this.paymentProvider.getPayment(paymentId);

    if (!payment.externalReference) {
      throw new BadRequestException(
        'Mercado Pago payment is missing external_reference',
      );
    }

    const purchase = await this.prisma.creditPurchase.findUnique({
      where: {
        id: payment.externalReference,
      },
    });

    if (!purchase) {
      throw new BadRequestException('Credit purchase not found');
    }

    if (payment.status === 'approved') {
      const confirmed = await this.confirmApprovedPayment(
        purchase.id,
        payment.providerPaymentId,
        payment.approvedAt,
      );

      if (confirmed) {
        this.eventsPublisher.publishCreditPurchased({
          purchaseId: confirmed.id,
          userId: confirmed.userId,
          packageName: this.toContractPackageName(confirmed.packageName),
          credits: confirmed.credits,
          payerEmail: confirmed.payerEmail,
          occurredAt: (confirmed.paidAt ?? new Date()).toISOString(),
        });
      }

      return {
        received: true,
        processed: Boolean(confirmed),
        status: 'PAID',
      };
    }

    if (this.isCanceledPaymentStatus(payment.status)) {
      const canceled = await this.prisma.creditPurchase.updateMany({
        where: {
          id: purchase.id,
          status: 'PENDING',
        },
        data: {
          status: 'CANCELED',
          providerPaymentId: payment.providerPaymentId,
          canceledAt: new Date(),
        },
      });

      return {
        received: true,
        processed: canceled.count > 0,
        status: 'CANCELED',
      };
    }

    return {
      received: true,
      processed: false,
      status: payment.status,
    };
  }

  private upsertCreditPackage(selectedPackage: PackageDefinition) {
    return this.prisma.creditPackage.upsert({
      where: {
        name: selectedPackage.schemaName,
      },
      create: {
        name: selectedPackage.schemaName,
        credits: selectedPackage.credits,
        pricePerCreditInCents: selectedPackage.pricePerCreditInCents,
        benefits: selectedPackage.benefits,
      },
      update: {
        credits: selectedPackage.credits,
        pricePerCreditInCents: selectedPackage.pricePerCreditInCents,
        benefits: selectedPackage.benefits,
      },
    });
  }

  private async createPendingPurchase(data: {
    userId: string;
    packageId: string;
    packageName: CreditPackageName;
    credits: number;
    amountInCents: number;
    payerEmail: string;
    idempotencyKey: string;
  }): Promise<CreditPurchase> {
    return this.prisma.creditPurchase.create({
      data: {
        ...data,
        status: 'PENDING',
      },
    });
  }

  private async toCreateCreditPurchaseResponse(
    purchase: CreditPurchase,
    idempotencyKey: string,
  ): Promise<CreateCreditPurchaseResponse> {
    if (purchase.status === 'CANCELED') {
      throw new ConflictException(
        'This idempotency key cannot be reused. Start a new checkout with a new Idempotency-Key.',
      );
    }

    if (purchase.checkoutUrl && purchase.providerPreferenceId) {
      return {
        purchaseId: purchase.id,
        status: purchase.status,
        checkoutUrl: purchase.checkoutUrl,
        providerPreferenceId: purchase.providerPreferenceId,
      };
    }

    if (purchase.status === 'PENDING') {
      const recoveredCheckout =
        await this.paymentProvider.findCheckoutPreferenceByPurchaseId(
          purchase.id,
        );

      if (recoveredCheckout) {
        return this.persistCheckout(purchase.id, recoveredCheckout);
      }

      return this.createAndPersistCheckout(purchase, idempotencyKey);
    }

    throw new ConflictException(
      'This idempotency key cannot be reused. Start a new checkout with a new Idempotency-Key.',
    );
  }

  private normalizeIdempotencyKey(idempotencyKey: string): string {
    const normalizedIdempotencyKey = idempotencyKey.trim();

    if (!normalizedIdempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return normalizedIdempotencyKey;
  }

  private async createAndPersistCheckout(
    purchase: CreditPurchase,
    idempotencyKey: string,
  ): Promise<CreateCreditPurchaseResponse> {
    const checkout = await this.paymentProvider.createCheckoutPreference({
      purchaseId: purchase.id,
      idempotencyKey,
      userId: purchase.userId,
      packageName: this.toContractPackageName(purchase.packageName),
      payerEmail: purchase.payerEmail,
      credits: purchase.credits,
      amountInCents: purchase.amountInCents,
    });

    return this.persistCheckout(purchase.id, checkout);
  }

  private async persistCheckout(
    purchaseId: string,
    checkout: CheckoutPreference,
  ): Promise<CreateCreditPurchaseResponse> {
    const updatedPurchase = await this.prisma.creditPurchase.update({
      where: {
        id: purchaseId,
      },
      data: {
        providerPreferenceId: checkout.providerPreferenceId,
        checkoutUrl: checkout.checkoutUrl,
      },
    });

    return {
      purchaseId: updatedPurchase.id,
      status: updatedPurchase.status,
      checkoutUrl: checkout.checkoutUrl,
      providerPreferenceId: checkout.providerPreferenceId,
    };
  }

  private assertSameIdempotentPurchase(
    purchase: CreditPurchase,
    body: PurchaseCreditsRequest,
  ): void {
    const packageName = this.toContractPackageName(purchase.packageName);

    if (
      purchase.userId !== body.userId ||
      purchase.payerEmail !== body.payerEmail ||
      packageName !== body.packageName
    ) {
      throw new ConflictException(
        'Idempotency-Key was already used for a different credit purchase.',
      );
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private async confirmApprovedPayment(
    purchaseId: string,
    providerPaymentId: string,
    approvedAt: Date | undefined,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.creditPurchase.updateMany({
        where: {
          id: purchaseId,
          status: 'PENDING',
        },
        data: {
          status: 'PAID',
          providerPaymentId,
          paidAt: approvedAt ?? new Date(),
        },
      });

      if (updated.count === 0) {
        return null;
      }

      const purchase = await transaction.creditPurchase.findUniqueOrThrow({
        where: {
          id: purchaseId,
        },
      });

      await transaction.userCreditBalance.upsert({
        where: {
          userId: purchase.userId,
        },
        create: {
          userId: purchase.userId,
          credits: purchase.credits,
        },
        update: {
          credits: {
            increment: purchase.credits,
          },
        },
      });

      return purchase;
    });
  }

  private extractPaymentId(
    payload: MercadoPagoWebhookPayload,
  ): string | undefined {
    const paymentId = payload.data?.id ?? payload.id;

    if (!paymentId) {
      return undefined;
    }

    return String(paymentId);
  }

  private isPaymentNotification(payload: MercadoPagoWebhookPayload): boolean {
    return (
      payload.type === 'payment' ||
      payload.topic === 'payment' ||
      payload.action?.startsWith('payment.') === true
    );
  }

  private isCanceledPaymentStatus(status: string): boolean {
    return [
      'cancelled',
      'canceled',
      'rejected',
      'refunded',
      'charged_back',
    ].includes(status);
  }

  private toContractPackageName(
    packageName: CreditPackageName,
  ): PurchaseCreditsRequest['packageName'] {
    return packageName.toLowerCase() as PurchaseCreditsRequest['packageName'];
  }
}
