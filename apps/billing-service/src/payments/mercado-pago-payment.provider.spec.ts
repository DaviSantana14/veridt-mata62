import { ServiceUnavailableException } from '@nestjs/common';
import { MercadoPagoPaymentProvider } from './mercado-pago-payment.provider';

const preferenceCreate = jest.fn();
const preferenceSearch = jest.fn();
const preferenceGet = jest.fn();
const paymentGet = jest.fn();

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Preference: jest.fn().mockImplementation(() => ({
    create: preferenceCreate,
    search: preferenceSearch,
    get: preferenceGet,
  })),
  Payment: jest.fn().mockImplementation(() => ({
    get: paymentGet,
  })),
}));

const envKeys = [
  'MERCADO_PAGO_ACCESS_TOKEN',
  'MERCADO_PAGO_WEBHOOK_URL',
  'MERCADO_PAGO_ENVIRONMENT',
  'FRONTEND_SUCCESS_URL',
  'FRONTEND_FAILURE_URL',
  'FRONTEND_PENDING_URL',
] as const;

const originalEnv = { ...process.env };

const checkoutInput = {
  purchaseId: 'purchase-1',
  userId: 'user-1',
  packageName: 'basic' as const,
  payerEmail: 'payer@example.com',
  credits: 10,
  amountInCents: 5000,
  idempotencyKey: 'key-1',
};

function resetEnv() {
  for (const key of envKeys) {
    delete process.env[key];
  }

  process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token';
  process.env.MERCADO_PAGO_WEBHOOK_URL =
    'https://webhook.example.com/billing/payments/mercado-pago/webhook';
}

describe('MercadoPagoPaymentProvider checkout preference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    resetEnv();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses sandbox checkout URL by default', async () => {
    preferenceCreate.mockResolvedValue({
      id: 'preference-1',
      init_point: 'https://www.mercadopago.test/checkout',
      sandbox_init_point: 'https://sandbox.mercadopago.test/checkout',
    });

    const result =
      await new MercadoPagoPaymentProvider().createCheckoutPreference(
        checkoutInput,
      );

    expect(result).toEqual({
      providerPreferenceId: 'preference-1',
      checkoutUrl: 'https://sandbox.mercadopago.test/checkout',
    });
  });

  it('uses production checkout URL when environment is production', async () => {
    process.env.MERCADO_PAGO_ENVIRONMENT = 'production';
    preferenceCreate.mockResolvedValue({
      id: 'preference-1',
      init_point: 'https://www.mercadopago.test/checkout',
      sandbox_init_point: 'https://sandbox.mercadopago.test/checkout',
    });

    const result =
      await new MercadoPagoPaymentProvider().createCheckoutPreference(
        checkoutInput,
      );

    expect(result.checkoutUrl).toBe('https://www.mercadopago.test/checkout');
  });

  it('sends preference metadata, redirect URLs, webhook URL and idempotency key', async () => {
    preferenceCreate.mockResolvedValue({
      id: 'preference-1',
      sandbox_init_point: 'https://sandbox.mercadopago.test/checkout',
    });

    await new MercadoPagoPaymentProvider().createCheckoutPreference(
      checkoutInput,
    );

    expect(preferenceCreate).toHaveBeenCalledWith({
      body: expect.objectContaining({
        auto_return: undefined,
        back_urls: {
          success:
            'http://localhost:3000/pagamento/retorno?status=success',
          failure:
            'http://localhost:3000/pagamento/retorno?status=failure',
          pending:
            'http://localhost:3000/pagamento/retorno?status=pending',
        },
        external_reference: 'purchase-1',
        notification_url:
          'https://webhook.example.com/billing/payments/mercado-pago/webhook',
        metadata: {
          purchaseId: 'purchase-1',
          userId: 'user-1',
          credits: 10,
        },
      }),
      requestOptions: {
        idempotencyKey: 'key-1',
      },
    });
  });

  it('omits auto_return when success back URL points to localhost', async () => {
    preferenceCreate.mockResolvedValue({
      id: 'preference-1',
      sandbox_init_point: 'https://sandbox.mercadopago.test/checkout',
    });

    await new MercadoPagoPaymentProvider().createCheckoutPreference(
      checkoutInput,
    );

    expect(preferenceCreate).toHaveBeenCalledWith({
      body: expect.objectContaining({
        auto_return: undefined,
        back_urls: expect.objectContaining({
          success:
            'http://localhost:3000/pagamento/retorno?status=success',
        }),
      }),
      requestOptions: {
        idempotencyKey: 'key-1',
      },
    });
  });

  it('sends auto_return when success back URL is public', async () => {
    process.env.FRONTEND_SUCCESS_URL =
      'https://app.example.com/pagamento/retorno?status=success';
    preferenceCreate.mockResolvedValue({
      id: 'preference-1',
      sandbox_init_point: 'https://sandbox.mercadopago.test/checkout',
    });

    await new MercadoPagoPaymentProvider().createCheckoutPreference(
      checkoutInput,
    );

    expect(preferenceCreate).toHaveBeenCalledWith({
      body: expect.objectContaining({
        auto_return: 'approved',
        back_urls: expect.objectContaining({
          success:
            'https://app.example.com/pagamento/retorno?status=success',
        }),
      }),
      requestOptions: {
        idempotencyKey: 'key-1',
      },
    });
  });

  it('uses fallback redirect URL when configured URL is blank', async () => {
    process.env.FRONTEND_SUCCESS_URL = ' ';
    preferenceCreate.mockResolvedValue({
      id: 'preference-1',
      sandbox_init_point: 'https://sandbox.mercadopago.test/checkout',
    });

    await new MercadoPagoPaymentProvider().createCheckoutPreference(
      checkoutInput,
    );

    expect(preferenceCreate).toHaveBeenCalledWith({
      body: expect.objectContaining({
        back_urls: expect.objectContaining({
          success:
            'http://localhost:3000/pagamento/retorno?status=success',
        }),
      }),
      requestOptions: {
        idempotencyKey: 'key-1',
      },
    });
  });

  it('throws a clear error when access token is missing', async () => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN;

    await expect(
      new MercadoPagoPaymentProvider().createCheckoutPreference(checkoutInput),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('throws a clear error when webhook URL is missing', async () => {
    delete process.env.MERCADO_PAGO_WEBHOOK_URL;

    await expect(
      new MercadoPagoPaymentProvider().createCheckoutPreference(checkoutInput),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
