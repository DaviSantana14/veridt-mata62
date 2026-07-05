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

const cardPaymentBody = {
  token: 'card-token-1',
  installments: 1,
  paymentMethodId: 'visa',
  issuerId: '25',
  payer: {
    email: 'payer@example.com',
    identification: {
      type: 'CPF',
      number: '12345678909',
    },
  },
};

const pixPaymentBody = {
  paymentMethodId: 'pix',
  selectedPaymentMethod: 'pix',
  payer: {
    email: 'payer@example.com',
  },
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
    createCardPayment: jest.fn(),
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

  it('returns credit packages with backend display names', () => {
    expect(service.getPackages()).toEqual([
      {
        id: 'basic',
        name: 'basic',
        displayName: 'Pacote Inicial',
        credits: 10,
        pricePerCreditInCents: 500,
        benefits: 'Pacote inicial para registros pontuais.',
      },
      {
        id: 'medium',
        name: 'medium',
        displayName: 'Pacote Profissional',
        credits: 30,
        pricePerCreditInCents: 450,
        benefits: 'Pacote intermediario para uso recorrente.',
      },
      {
        id: 'premium',
        name: 'premium',
        displayName: 'Pacote Empresarial',
        credits: 80,
        pricePerCreditInCents: 400,
        benefits: 'Pacote premium para alto volume de registros.',
      },
    ]);
  });

  it('creates an embedded card purchase without checkout preference', async () => {
    const purchase = makePurchase();

    prisma.creditPurchase.findUnique.mockResolvedValue(null);
    prisma.creditPurchase.create.mockResolvedValue(purchase);

    const result = await service.createCardPurchase(purchaseBody, ' key-1 ');

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
    expect(paymentProvider.createCheckoutPreference).not.toHaveBeenCalled();
    expect(prisma.userCreditBalance.upsert).not.toHaveBeenCalled();
    expect(result).toEqual({
      purchaseId: purchase.id,
      amountInCents: 5000,
      credits: 10,
      packageName: 'basic',
      packageDisplayName: 'Pacote Inicial',
      pricePerCreditInCents: 500,
      payerEmail: 'payer@example.com',
    });
  });

  it('processes approved embedded card payment and credits once', async () => {
    const approvedAt = new Date('2026-05-29T12:30:00.000Z');
    const paidPurchase = makePurchase({
      status: 'PAID',
      paidAt: approvedAt,
    });

    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());
    paymentProvider.createCardPayment.mockResolvedValue({
      providerPaymentId: 'payment-1',
      status: 'approved',
      externalReference: 'purchase-1',
      approvedAt,
    });
    prisma.creditPurchase.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.creditPurchase.findUniqueOrThrow.mockResolvedValue(paidPurchase);

    const result = await service.createMercadoPagoCardPayment(
      'purchase-1',
      cardPaymentBody,
      'payment-key-1',
    );

    expect(paymentProvider.createCardPayment).toHaveBeenCalledWith({
      ...cardPaymentBody,
      purchaseId: 'purchase-1',
      idempotencyKey: 'card-payment-purchase-1',
      userId: 'user-1',
      packageName: 'basic',
      amountInCents: 5000,
      credits: 10,
      payerEmail: 'payer@example.com',
      payer: cardPaymentBody.payer,
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
      purchaseId: 'purchase-1',
      status: 'PAID',
      providerPaymentId: 'payment-1',
    });
  });

  it('keeps embedded card purchase pending when payment is pending', async () => {
    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());
    paymentProvider.createCardPayment.mockResolvedValue({
      providerPaymentId: 'payment-1',
      status: 'pending',
      externalReference: 'purchase-1',
    });
    prisma.creditPurchase.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.createMercadoPagoCardPayment(
      'purchase-1',
      cardPaymentBody,
      'payment-key-1',
    );

    expect(prisma.userCreditBalance.upsert).not.toHaveBeenCalled();
    expect(eventsPublisher.publishCreditPurchased).not.toHaveBeenCalled();
    expect(prisma.creditPurchase.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'purchase-1',
        status: 'PENDING',
      },
      data: {
        providerPaymentId: 'payment-1',
      },
    });
    expect(result).toEqual({
      purchaseId: 'purchase-1',
      status: 'PENDING',
      providerPaymentId: 'payment-1',
    });
  });

  it('creates pending Pix payment without card token or installments', async () => {
    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());
    paymentProvider.createCardPayment.mockResolvedValue({
      providerPaymentId: 'payment-pix-1',
      status: 'pending',
      externalReference: 'purchase-1',
      pix: {
        qrCode: 'pix-copy-paste-code',
        qrCodeBase64: 'base64-qr-code',
        ticketUrl: 'https://mercadopago.test/pix/payment-pix-1',
      },
    });
    prisma.creditPurchase.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.createMercadoPagoCardPayment(
      'purchase-1',
      pixPaymentBody,
      'payment-key-1',
    );

    expect(paymentProvider.createCardPayment).toHaveBeenCalledWith({
      ...pixPaymentBody,
      purchaseId: 'purchase-1',
      idempotencyKey: 'card-payment-purchase-1',
      userId: 'user-1',
      packageName: 'basic',
      amountInCents: 5000,
      credits: 10,
      payerEmail: 'payer@example.com',
      payer: pixPaymentBody.payer,
    });
    expect(prisma.userCreditBalance.upsert).not.toHaveBeenCalled();
    expect(eventsPublisher.publishCreditPurchased).not.toHaveBeenCalled();
    expect(result).toEqual({
      purchaseId: 'purchase-1',
      status: 'PENDING',
      providerPaymentId: 'payment-pix-1',
      pix: {
        qrCode: 'pix-copy-paste-code',
        qrCodeBase64: 'base64-qr-code',
        ticketUrl: 'https://mercadopago.test/pix/payment-pix-1',
      },
    });
  });

  it('simulates a pending payment and credits once', async () => {
    const paidPurchase = makePurchase({
      status: 'PAID',
      providerPaymentId: 'sandbox-simulation-purchase-1',
      paidAt: new Date('2026-05-29T12:30:00.000Z'),
    });

    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());
    prisma.creditPurchase.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.creditPurchase.findUniqueOrThrow.mockResolvedValue(paidPurchase);

    const result = await service.simulatePayment('purchase-1');

    expect(prisma.creditPurchase.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'purchase-1',
        status: 'PENDING',
      },
      data: {
        status: 'PAID',
        providerPaymentId: 'sandbox-simulation-purchase-1',
        paidAt: expect.any(Date) as Date,
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
      purchaseId: 'purchase-1',
      status: 'PAID',
      credits: 10,
      packageName: 'basic',
      packageDisplayName: 'Pacote Inicial',
    });
  });

  it('returns paid simulated purchases without duplicating credits', async () => {
    prisma.creditPurchase.findUnique.mockResolvedValue(
      makePurchase({
        status: 'PAID',
        providerPaymentId: 'sandbox-simulation-purchase-1',
      }),
    );

    const result = await service.simulatePayment('purchase-1');

    expect(prisma.creditPurchase.updateMany).not.toHaveBeenCalled();
    expect(prisma.userCreditBalance.upsert).not.toHaveBeenCalled();
    expect(eventsPublisher.publishCreditPurchased).not.toHaveBeenCalled();
    expect(result).toEqual({
      purchaseId: 'purchase-1',
      status: 'PAID',
      credits: 10,
      packageName: 'basic',
      packageDisplayName: 'Pacote Inicial',
    });
  });

  it('rejects simulation for canceled purchases', async () => {
    prisma.creditPurchase.findUnique.mockResolvedValue(
      makePurchase({
        status: 'CANCELED',
      }),
    );

    await expect(service.simulatePayment('purchase-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.userCreditBalance.upsert).not.toHaveBeenCalled();
  });

  it('rejects simulation for missing purchases', async () => {
    prisma.creditPurchase.findUnique.mockResolvedValue(null);

    await expect(
      service.simulatePayment('missing-purchase'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.userCreditBalance.upsert).not.toHaveBeenCalled();
  });

  it('rejects card payment submissions without token or installments', async () => {
    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());

    await expect(
      service.createMercadoPagoCardPayment(
        'purchase-1',
        {
          paymentMethodId: 'visa',
          payer: {
            email: 'payer@example.com',
          },
        },
        'payment-key-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(paymentProvider.createCardPayment).not.toHaveBeenCalled();
  });

  it('cancels embedded card purchase when payment is rejected', async () => {
    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());
    paymentProvider.createCardPayment.mockResolvedValue({
      providerPaymentId: 'payment-1',
      status: 'rejected',
      externalReference: 'purchase-1',
    });
    prisma.creditPurchase.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.createMercadoPagoCardPayment(
      'purchase-1',
      cardPaymentBody,
      'payment-key-1',
    );

    expect(prisma.userCreditBalance.upsert).not.toHaveBeenCalled();
    expect(eventsPublisher.publishCreditPurchased).not.toHaveBeenCalled();
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
      purchaseId: 'purchase-1',
      status: 'CANCELED',
      providerPaymentId: 'payment-1',
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

  it('processes Mercado Pago webhooks when payment id arrives as query data.id', async () => {
    paymentProvider.getPayment.mockResolvedValue({
      providerPaymentId: 'payment-1',
      status: 'pending',
      externalReference: 'purchase-1',
    });
    prisma.creditPurchase.findUnique.mockResolvedValue(makePurchase());

    const result = await service.handleMercadoPagoWebhook({
      type: 'payment',
      'data.id': 'payment-1',
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
  const signature = createHmac('sha256', secret).update(manifest).digest('hex');

  return `ts=${timestamp},v1=${signature}`;
}
