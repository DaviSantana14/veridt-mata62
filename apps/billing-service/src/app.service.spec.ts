import { createHmac } from 'crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { PurchaseCreditsRequest } from '@veridit/contracts';
import { AppService } from './app.service';
import {
  CreditPackageName,
  type CreditPurchase,
} from './generated/prisma/client';
import { BillingEventsPublisher } from './messaging/billing-events.publisher';
import { PAYMENT_PROVIDER } from './payments/payment-provider.interface';
import { PrismaService } from './prisma/prisma.service';

type PrismaMock = ReturnType<typeof createPrismaMock>;
type PaymentProviderMock = ReturnType<typeof createPaymentProviderMock>;
type EventsPublisherMock = ReturnType<typeof createEventsPublisherMock>;

const purchaseBody: PurchaseCreditsRequest = {
  userId: 'user-1',
  packageName: 'basic',
  payerEmail: 'payer@example.com',
};

const checkout = {
  providerPreferenceId: 'preference-1',
  checkoutUrl: 'https://mercadopago.test/checkout',
};

function createPrismaMock() {
  return {
    creditPackage: {
      upsert: jest.fn(),
    },
    creditPurchase: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userCreditBalance: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

function createPaymentProviderMock() {
  return {
    createCheckoutPreference: jest.fn(),
    findCheckoutPreferenceByPurchaseId: jest.fn(),
    getPayment: jest.fn(),
  };
}

function createEventsPublisherMock() {
  return {
    publishCreditPurchased: jest.fn(),
  };
}

function makePurchase(overrides: Partial<CreditPurchase> = {}): CreditPurchase {
  return {
    id: 'purchase-1',
    userId: 'user-1',
    packageId: 'package-basic',
    packageName: CreditPackageName.BASIC,
    credits: 10,
    amountInCents: 5000,
    payerEmail: 'payer@example.com',
    status: 'PENDING',
    provider: 'MERCADO_PAGO',
    idempotencyKey: 'key-1',
    providerPreferenceId: null,
    providerPaymentId: null,
    checkoutUrl: null,
    paidAt: null,
    canceledAt: null,
    createdAt: new Date('2026-05-29T12:00:00.000Z'),
    ...overrides,
  };
}

describe('AppService Mercado Pago billing flow', () => {
  let service: AppService;
  let prisma: PrismaMock;
  let paymentProvider: PaymentProviderMock;
  let eventsPublisher: EventsPublisherMock;

  beforeEach(async () => {
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    prisma = createPrismaMock();
    paymentProvider = createPaymentProviderMock();
    eventsPublisher = createEventsPublisherMock();

    prisma.creditPackage.upsert.mockResolvedValue({
      id: 'package-basic',
    });
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: PrismaMock) => Promise<unknown>) =>
        callback(prisma),
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: BillingEventsPublisher,
          useValue: eventsPublisher,
        },
        {
          provide: PAYMENT_PROVIDER,
          useValue: paymentProvider,
        },
      ],
    }).compile();

    service = moduleRef.get<AppService>(AppService);
  });

  it('creates a pending purchase and checkout without crediting balance', async () => {
    const purchase = makePurchase();

    prisma.creditPurchase.findUnique.mockResolvedValue(null);
    prisma.creditPurchase.create.mockResolvedValue(purchase);
    paymentProvider.createCheckoutPreference.mockResolvedValue(checkout);
    prisma.creditPurchase.update.mockResolvedValue(
      makePurchase({
        checkoutUrl: checkout.checkoutUrl,
        providerPreferenceId: checkout.providerPreferenceId,
      }),
    );

    const result = await service.createCreditPurchase(purchaseBody, ' key-1 ');

    expect(prisma.creditPurchase.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        packageId: 'package-basic',
        packageName: CreditPackageName.BASIC,
        credits: 10,
        amountInCents: 5000,
        payerEmail: 'payer@example.com',
        idempotencyKey: 'key-1',
        status: 'PENDING',
      },
    });
    expect(paymentProvider.createCheckoutPreference).toHaveBeenCalledWith({
      purchaseId: purchase.id,
      idempotencyKey: 'key-1',
      userId: purchase.userId,
      packageName: 'basic',
      payerEmail: purchase.payerEmail,
      credits: purchase.credits,
      amountInCents: purchase.amountInCents,
    });
    expect(prisma.userCreditBalance.upsert).not.toHaveBeenCalled();
    expect(eventsPublisher.publishCreditPurchased).not.toHaveBeenCalled();
    expect(result).toEqual({
      purchaseId: purchase.id,
      status: 'PENDING',
      checkoutUrl: checkout.checkoutUrl,
      providerPreferenceId: checkout.providerPreferenceId,
    });
  });

  it('returns an existing checkout for the same idempotency key and payload', async () => {
    prisma.creditPurchase.findUnique.mockResolvedValue(
      makePurchase({
        checkoutUrl: checkout.checkoutUrl,
        providerPreferenceId: checkout.providerPreferenceId,
      }),
    );

    const result = await service.createCreditPurchase(purchaseBody, 'key-1');

    expect(paymentProvider.createCheckoutPreference).not.toHaveBeenCalled();
    expect(result).toEqual({
      purchaseId: 'purchase-1',
      status: 'PENDING',
      checkoutUrl: checkout.checkoutUrl,
      providerPreferenceId: checkout.providerPreferenceId,
    });
  });

  it('rejects idempotency key reuse with a different payload', async () => {
    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());

    await expect(
      service.createCreditPurchase(
        {
          ...purchaseBody,
          packageName: 'medium',
        },
        'key-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects canceled purchases even when checkout data exists', async () => {
    prisma.creditPurchase.findUnique.mockResolvedValue(
      makePurchase({
        status: 'CANCELED',
        checkoutUrl: checkout.checkoutUrl,
        providerPreferenceId: checkout.providerPreferenceId,
      }),
    );

    await expect(
      service.createCreditPurchase(purchaseBody, 'key-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(paymentProvider.createCheckoutPreference).not.toHaveBeenCalled();
  });

  it('recovers a pending checkout from the provider before creating another one', async () => {
    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());
    paymentProvider.findCheckoutPreferenceByPurchaseId.mockResolvedValue(
      checkout,
    );
    prisma.creditPurchase.update.mockResolvedValue(
      makePurchase({
        checkoutUrl: checkout.checkoutUrl,
        providerPreferenceId: checkout.providerPreferenceId,
      }),
    );

    const result = await service.createCreditPurchase(purchaseBody, 'key-1');

    expect(
      paymentProvider.findCheckoutPreferenceByPurchaseId,
    ).toHaveBeenCalledWith('purchase-1');
    expect(paymentProvider.createCheckoutPreference).not.toHaveBeenCalled();
    expect(result.checkoutUrl).toBe(checkout.checkoutUrl);
  });

  it('recreates checkout with the same idempotency key when recovery finds nothing', async () => {
    const purchase = makePurchase();

    prisma.creditPurchase.findUnique.mockResolvedValue(purchase);
    paymentProvider.findCheckoutPreferenceByPurchaseId.mockResolvedValue(null);
    paymentProvider.createCheckoutPreference.mockResolvedValue(checkout);
    prisma.creditPurchase.update.mockResolvedValue(
      makePurchase({
        checkoutUrl: checkout.checkoutUrl,
        providerPreferenceId: checkout.providerPreferenceId,
      }),
    );

    await service.createCreditPurchase(purchaseBody, 'key-1');

    expect(paymentProvider.createCheckoutPreference).toHaveBeenCalledWith({
      purchaseId: purchase.id,
      idempotencyKey: 'key-1',
      userId: purchase.userId,
      packageName: 'basic',
      payerEmail: purchase.payerEmail,
      credits: purchase.credits,
      amountInCents: purchase.amountInCents,
    });
  });

  it('ignores non-payment webhook notifications without calling provider', async () => {
    const result = await service.handleMercadoPagoWebhook({
      type: 'merchant_order',
      data: {
        id: 'order-1',
      },
    });

    expect(result).toEqual({
      received: true,
      processed: false,
    });
    expect(paymentProvider.getPayment).not.toHaveBeenCalled();
  });

  it('processes Mercado Pago webhooks without signature when no secret is configured', async () => {
    paymentProvider.getPayment.mockResolvedValue({
      providerPaymentId: 'payment-1',
      status: 'pending',
      externalReference: 'purchase-1',
    });
    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());

    const result = await service.handleMercadoPagoWebhook({
      type: 'payment',
      data: {
        id: 'payment-1',
      },
    });

    expect(paymentProvider.getPayment).toHaveBeenCalledWith('payment-1');
    expect(result).toEqual({
      received: true,
      processed: false,
      status: 'pending',
    });
  });

  it('rejects Mercado Pago webhook when secret is configured and signature is missing', async () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'webhook-secret';

    await expect(
      service.handleMercadoPagoWebhook(
        {
          type: 'payment',
          data: {
            id: 'payment-1',
          },
        },
        {
          xRequestId: 'request-1',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(paymentProvider.getPayment).not.toHaveBeenCalled();
  });

  it('rejects Mercado Pago webhook with invalid signature', async () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'webhook-secret';

    await expect(
      service.handleMercadoPagoWebhook(
        {
          type: 'payment',
          data: {
            id: 'payment-1',
          },
        },
        {
          xSignature: 'ts=1,v1=invalid',
          xRequestId: 'request-1',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(paymentProvider.getPayment).not.toHaveBeenCalled();
  });

  it('accepts Mercado Pago webhook with valid HMAC signature', async () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'webhook-secret';
    const signature = signMercadoPagoWebhook({
      dataId: 'payment-1',
      requestId: 'request-1',
      timestamp: '123',
      secret: 'webhook-secret',
    });

    paymentProvider.getPayment.mockResolvedValue({
      providerPaymentId: 'payment-1',
      status: 'pending',
      externalReference: 'purchase-1',
    });
    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());

    const result = await service.handleMercadoPagoWebhook(
      {
        type: 'payment',
        data: {
          id: 'payment-1',
        },
      },
      {
        xSignature: signature,
        xRequestId: 'request-1',
      },
    );

    expect(paymentProvider.getPayment).toHaveBeenCalledWith('payment-1');
    expect(result).toEqual({
      received: true,
      processed: false,
      status: 'pending',
    });
  });

  it('confirms an approved pending payment once and publishes the event', async () => {
    const approvedAt = new Date('2026-05-29T12:30:00.000Z');
    const paidPurchase = makePurchase({
      status: 'PAID',
      paidAt: approvedAt,
    });

    paymentProvider.getPayment.mockResolvedValue({
      providerPaymentId: 'payment-1',
      status: 'approved',
      externalReference: 'purchase-1',
      approvedAt,
    });
    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());
    prisma.creditPurchase.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.creditPurchase.findUniqueOrThrow.mockResolvedValue(paidPurchase);

    const result = await service.handleMercadoPagoWebhook({
      type: 'payment',
      data: {
        id: 'payment-1',
      },
    });

    expect(prisma.creditPurchase.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'purchase-1',
        status: 'PENDING',
      },
      data: {
        status: 'PAID',
        providerPaymentId: 'payment-1',
        paidAt: approvedAt,
      },
    });
    expect(prisma.userCreditBalance.upsert).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
      create: {
        userId: 'user-1',
        credits: 10,
      },
      update: {
        credits: {
          increment: 10,
        },
      },
    });
    expect(eventsPublisher.publishCreditPurchased).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      received: true,
      processed: true,
      status: 'PAID',
    });
  });

  it('does not duplicate credits or events for duplicate approved webhooks', async () => {
    paymentProvider.getPayment.mockResolvedValue({
      providerPaymentId: 'payment-1',
      status: 'approved',
      externalReference: 'purchase-1',
      approvedAt: new Date('2026-05-29T12:30:00.000Z'),
    });
    prisma.creditPurchase.findUnique.mockResolvedValue(
      makePurchase({
        status: 'PAID',
      }),
    );
    prisma.creditPurchase.updateMany.mockResolvedValue({
      count: 0,
    });

    const result = await service.handleMercadoPagoWebhook({
      topic: 'payment',
      id: 'payment-1',
    });

    expect(prisma.userCreditBalance.upsert).not.toHaveBeenCalled();
    expect(eventsPublisher.publishCreditPurchased).not.toHaveBeenCalled();
    expect(result).toEqual({
      received: true,
      processed: false,
      status: 'PAID',
    });
  });

  it('does not credit an approved payment for a canceled purchase', async () => {
    paymentProvider.getPayment.mockResolvedValue({
      providerPaymentId: 'payment-1',
      status: 'approved',
      externalReference: 'purchase-1',
      approvedAt: new Date('2026-05-29T12:30:00.000Z'),
    });
    prisma.creditPurchase.findUnique.mockResolvedValue(
      makePurchase({
        status: 'CANCELED',
      }),
    );
    prisma.creditPurchase.updateMany.mockResolvedValue({
      count: 0,
    });

    await service.handleMercadoPagoWebhook({
      action: 'payment.updated',
      data: {
        id: 'payment-1',
      },
    });

    expect(prisma.userCreditBalance.upsert).not.toHaveBeenCalled();
    expect(eventsPublisher.publishCreditPurchased).not.toHaveBeenCalled();
  });

  it('marks pending purchases as canceled for rejected payments', async () => {
    paymentProvider.getPayment.mockResolvedValue({
      providerPaymentId: 'payment-1',
      status: 'rejected',
      externalReference: 'purchase-1',
    });
    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());
    prisma.creditPurchase.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.handleMercadoPagoWebhook({
      type: 'payment',
      data: {
        id: 'payment-1',
      },
    });

    expect(prisma.creditPurchase.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'purchase-1',
        status: 'PENDING',
      },
      data: {
        status: 'CANCELED',
        providerPaymentId: 'payment-1',
        canceledAt: expect.any(Date) as Date,
      },
    });
    expect(result).toEqual({
      received: true,
      processed: true,
      status: 'CANCELED',
    });
  });
});

function signMercadoPagoWebhook({
  dataId,
  requestId,
  timestamp,
  secret,
}: {
  dataId: string;
  requestId: string;
  timestamp: string;
  secret: string;
}): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const signature = createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  return `ts=${timestamp},v1=${signature}`;
}
