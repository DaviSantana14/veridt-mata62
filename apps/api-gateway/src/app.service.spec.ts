import { BadGatewayException, HttpException } from '@nestjs/common';
import type {
  CreateCreditPurchaseRequest,
  CreateCreditPurchaseResponse,
} from '@veridit/contracts';
import { AppService } from './app.service';

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

function fetchResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

async function expectHttpException(
  promise: Promise<unknown>,
  status: number,
  response: unknown,
) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    const exception = error as HttpException;

    expect(exception.getStatus()).toBe(status);
    expect(exception.getResponse()).toEqual(response);
    return;
  }

  throw new Error('Expected promise to reject');
}

describe('Api Gateway AppService billing purchases', () => {
  let service: AppService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = new AppService();
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards billing purchases with the idempotency key header', async () => {
    fetchMock.mockResolvedValue(fetchResponse(200, purchaseResponse));

    const result = await service.createCreditPurchase(purchaseBody, 'key-1');

    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:3102/purchases', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': 'key-1',
      },
      body: JSON.stringify(purchaseBody),
    });
    expect(result).toEqual(purchaseResponse);
  });

  it('preserves billing 400 responses as HttpException', async () => {
    const payload = {
      statusCode: 400,
      message: 'Idempotency-Key header is required',
    };

    fetchMock.mockResolvedValue(fetchResponse(400, payload));

    await expectHttpException(
      service.createCreditPurchase(purchaseBody, 'key-1'),
      400,
      payload,
    );
  });

  it('preserves billing 409 responses as HttpException', async () => {
    const payload = {
      statusCode: 409,
      message: 'Idempotency-Key was already used for a different purchase.',
    };

    fetchMock.mockResolvedValue(fetchResponse(409, payload));

    await expectHttpException(
      service.createCreditPurchase(purchaseBody, 'key-1'),
      409,
      payload,
    );
  });

  it('forwards billing 5xx responses as HttpException payloads', async () => {
    fetchMock.mockResolvedValue(
      fetchResponse(503, {
        statusCode: 503,
        message: 'Billing unavailable',
      }),
    );

    await expectHttpException(
      service.createCreditPurchase(purchaseBody, 'key-1'),
      503,
      {
        service: 'billing-service',
        statusCode: 503,
        payload: {
          statusCode: 503,
          message: 'Billing unavailable',
        },
      },
    );
  });

  it('wraps network errors as BadGatewayException', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(
      service.createCreditPurchase(purchaseBody, 'key-1'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('proxies Mercado Pago webhook payloads with signature headers', async () => {
    const response = {
      received: true,
      processed: true,
      status: 'PAID',
    };
    const body = {
      type: 'payment',
      data: {
        id: 'payment-1',
      },
    };
    const query = {
      'data.id': 'payment-1',
    };

    fetchMock.mockResolvedValue(fetchResponse(200, response));

    const result = await service.handleMercadoPagoWebhook(
      body,
      {
        'x-signature': 'ts=1,v1=signature-1',
        'x-request-id': 'request-1',
        authorization: 'Bearer should-not-forward',
      },
      query,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3102/payments/mercado-pago/webhook',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-signature': 'ts=1,v1=signature-1',
          'x-request-id': 'request-1',
        },
        body: JSON.stringify({
          ...query,
          ...body,
          data: body.data,
        }),
      },
    );
    expect(result).toEqual(response);
  });
});
