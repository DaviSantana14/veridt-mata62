import { BadRequestException } from '@nestjs/common';
import type {
  CreateCreditPurchaseRequest,
  CreateCreditPurchaseResponse,
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

describe('Api Gateway AppController billing purchases', () => {
  let controller: AppController;
  let appService: {
    createCreditPurchase: jest.Mock;
  };

  beforeEach(() => {
    appService = {
      createCreditPurchase: jest.fn().mockResolvedValue(purchaseResponse),
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
});
