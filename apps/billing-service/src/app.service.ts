import { Injectable } from '@nestjs/common';
import {
  type CreditPackageResponse,
  type HealthResponse,
  type PurchaseCreditsRequest,
} from '@veridit/contracts';
import { CreditPackageName } from './generated/prisma/client';
import { BillingEventsPublisher } from './messaging/billing-events.publisher';
import { PrismaService } from './prisma/prisma.service';

type PackageDefinition = CreditPackageResponse & {
  schemaName: CreditPackageName;
};

export type MockPurchaseResponse = PurchaseCreditsRequest & {
  purchaseId: string;
  status: string;
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

    const creditPackage = await this.prisma.creditPackage.upsert({
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
}
