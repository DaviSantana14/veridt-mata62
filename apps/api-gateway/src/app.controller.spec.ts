import { BadRequestException } from '@nestjs/common';
import type {
  CreateCardPaymentRequest,
  CreateCardPaymentResponse,
  CreateCreditPurchaseRequest,
  CreateCreditPurchaseResponse,
  CreateEmbeddedCreditPurchaseResponse,
  SimulatePaymentResponse,
  UserCreditBalanceResponse,
} from '@veridit/contracts';
import { AppController } from './app.controller';
import type { AppService } from './app.service';

const purchaseBody: CreateCreditPurchaseRequest = {
  userId: 'user-1',
  packageName: 'basic',
  payerEmail: 'payer@example.com',
};

const purchaseResponse: CreateCreditPurchaseResponse = {
  purchaseId: 'purchase-1',
  status: 'PENDING',
  checkoutUrl: 'https://mercadopago.test/checkout',
  providerPreferenceId: 'preference-1',
};

const embeddedPurchaseResponse: CreateEmbeddedCreditPurchaseResponse = {
  purchaseId: 'purchase-1',
  amountInCents: 5000,
  credits: 10,
  packageName: 'basic',
  packageDisplayName: 'Pacote Inicial',
  pricePerCreditInCents: 500,
  payerEmail: 'payer@example.com',
};

const cardPaymentBody: CreateCardPaymentRequest = {
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

const cardPaymentResponse: CreateCardPaymentResponse = {
  purchaseId: 'purchase-1',
  status: 'PAID',
  providerPaymentId: 'payment-1',
};

const simulatePaymentResponse: SimulatePaymentResponse = {
  purchaseId: 'purchase-1',
  status: 'PAID',
  credits: 10,
  packageName: 'basic',
  packageDisplayName: 'Pacote Inicial',
};

const creditBalanceResponse: UserCreditBalanceResponse = {
  userId: 'user-1',
  credits: 15,
  updatedAt: '2026-05-29T12:00:00.000Z',
};

describe('Api Gateway AppController billing purchases', () => {
  let controller: AppController;
  let appService: {
    createCreditPurchase: jest.Mock;
    createCardPurchase: jest.Mock;
    createMercadoPagoCardPayment: jest.Mock;
    getUserCreditBalance: jest.Mock;
    simulatePayment: jest.Mock;
    handleMercadoPagoWebhook: jest.Mock;
  };

  beforeEach(() => {
    appService = {
      createCreditPurchase: jest.fn().mockResolvedValue(purchaseResponse),
      createCardPurchase: jest.fn().mockResolvedValue(embeddedPurchaseResponse),
      createMercadoPagoCardPayment: jest
        .fn()
        .mockResolvedValue(cardPaymentResponse),
      getUserCreditBalance: jest.fn().mockResolvedValue(creditBalanceResponse),
      simulatePayment: jest.fn().mockResolvedValue(simulatePaymentResponse),
      handleMercadoPagoWebhook: jest.fn().mockResolvedValue({
        received: true,
        processed: true,
        status: 'PAID',
      }),
    };
    controller = new AppController(appService as unknown as AppService);
  });

  it('rejects missing idempotency key headers', () => {
    expect(() =>
      controller.createCreditPurchase(purchaseBody, undefined),
    ).toThrow(BadRequestException);
  });

  it('passes valid purchase requests to the service', async () => {
    await expect(
      controller.createCreditPurchase(purchaseBody, 'key-1'),
    ).resolves.toEqual(purchaseResponse);

    expect(appService.createCreditPurchase).toHaveBeenCalledWith(
      purchaseBody,
      'key-1',
    );
  });

  it('passes embedded card purchase requests to the service', async () => {
    await expect(
      controller.createCardPurchase(purchaseBody, 'key-1'),
    ).resolves.toEqual(embeddedPurchaseResponse);

    expect(appService.createCardPurchase).toHaveBeenCalledWith(
      purchaseBody,
      'key-1',
    );
  });

  it('passes user credit balance requests to the service', async () => {
    await expect(controller.getUserCreditBalance('user-1')).resolves.toEqual(
      creditBalanceResponse,
    );

    expect(appService.getUserCreditBalance).toHaveBeenCalledWith('user-1');
  });

  it('rejects embedded card purchases without idempotency key headers', () => {
    expect(() =>
      controller.createCardPurchase(purchaseBody, undefined),
    ).toThrow(BadRequestException);
  });

  it('passes embedded Mercado Pago card payment requests to the service', async () => {
    await expect(
      controller.createMercadoPagoCardPayment(
        'purchase-1',
        cardPaymentBody,
        'payment-key-1',
      ),
    ).resolves.toEqual(cardPaymentResponse);

    expect(appService.createMercadoPagoCardPayment).toHaveBeenCalledWith(
      'purchase-1',
      cardPaymentBody,
      'payment-key-1',
    );
  });

  it('rejects embedded Mercado Pago card payments without idempotency key headers', () => {
    expect(() =>
      controller.createMercadoPagoCardPayment(
        'purchase-1',
        cardPaymentBody,
        undefined,
      ),
    ).toThrow(BadRequestException);
  });

  it('passes simulated payment requests to the service', async () => {
    await expect(controller.simulatePayment('purchase-1')).resolves.toEqual(
      simulatePaymentResponse,
    );

    expect(appService.simulatePayment).toHaveBeenCalledWith('purchase-1');
  });

  it('forwards Mercado Pago webhook payloads', async () => {
    const body = { type: 'payment', data: { id: 'payment-1' } };
    const headers = {
      'x-signature': 'ts=1,v1=signature-1',
      'x-request-id': 'request-1',
    };
    const query = { 'data.id': 'payment-1' };

    await expect(
      controller.handleMercadoPagoWebhook(body, headers, query),
    ).resolves.toEqual({
      received: true,
      processed: true,
      status: 'PAID',
    });

    expect(appService.handleMercadoPagoWebhook).toHaveBeenCalledWith(
      body,
      headers,
      query,
    );
  });
});
