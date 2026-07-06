import { BadGatewayException, HttpException } from '@nestjs/common';
import type {
  BrowserInputRequest,
  CaptureAssetResponse,
  CaptureFrameResponse,
  CaptureRecordDetailsResponse,
  CaptureVideoStateResponse,
  CompleteCaptureResponse,
  CreateCardPaymentRequest,
  CreateCardPaymentResponse,
  CreateCreditPurchaseRequest,
  CreateCreditPurchaseResponse,
  CreateEmbeddedCreditPurchaseResponse,
  ListCaptureRecordsResponse,
  SimulatePaymentResponse,
  StartCaptureRequest,
  StartCaptureSessionResponse,
  UserCreditBalanceResponse,
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

const startCaptureBody: StartCaptureRequest = {
  userId: 'user-1',
  siteUrl: 'https://example.com',
};

const startCaptureResponse: StartCaptureSessionResponse = {
  id: 'record-1',
  userId: 'user-1',
  title: 'Registro de conteudo',
  status: 'STARTED',
  siteUrl: 'https://example.com',
  startedAt: '2026-07-05T12:00:00.000Z',
  viewport: {
    width: 1366,
    height: 768,
  },
};

const captureRecordDetailsResponse: CaptureRecordDetailsResponse = {
  id: 'record-1',
  userId: 'user-1',
  title: 'Registro de conteudo',
  status: 'STARTED',
  siteUrl: 'https://example.com',
  startedAt: '2026-07-05T12:00:00.000Z',
  imageCount: 2,
  videoCount: 1,
};

const listCaptureRecordsResponse: ListCaptureRecordsResponse = {
  userId: 'user-1',
  records: [
    {
      ...captureRecordDetailsResponse,
      details: 'Concluido com evidencias.',
    },
  ],
};

const captureFrameResponse: CaptureFrameResponse = {
  recordId: 'record-1',
  mimeType: 'image/jpeg',
  imageBase64: 'base64-frame',
  currentUrl: 'https://example.com',
  capturedAt: '2026-07-05T12:00:00.000Z',
  viewport: {
    width: 1366,
    height: 768,
  },
};

const browserInputBody: BrowserInputRequest = {
  type: 'wheel',
  deltaX: 0,
  deltaY: 240,
};

const navigateBody = {
  siteUrl: 'https://www.ufba.br',
};

const navigateResponse = {
  accepted: true,
  currentUrl: 'https://www.ufba.br/',
};

const screenshotResponse: CaptureAssetResponse = {
  id: 'asset-1',
  recordId: 'record-1',
  type: 'IMAGE',
  fileName: 'screenshot.png',
  fileSizeBytes: 1200,
  createdAt: '2026-07-05T12:00:00.000Z',
};

const videoStateResponse: CaptureVideoStateResponse = {
  recording: true,
};

const completeCaptureResponse: CompleteCaptureResponse = {
  id: 'record-1',
  userId: 'user-1',
  title: 'Registro de conteudo',
  siteUrl: 'https://example.com',
  status: 'COMPLETED',
  startedAt: '2026-07-05T12:00:00.000Z',
  finishedAt: '2026-07-05T12:05:00.000Z',
  imageCount: 1,
  videoCount: 1,
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

  it('forwards embedded card purchases with the idempotency key header', async () => {
    fetchMock.mockResolvedValue(fetchResponse(200, embeddedPurchaseResponse));

    const result = await service.createCardPurchase(purchaseBody, 'key-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3102/purchases/card',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': 'key-1',
        },
        body: JSON.stringify(purchaseBody),
      },
    );
    expect(result).toEqual(embeddedPurchaseResponse);
  });

  it('forwards embedded card payment submissions with the idempotency key header', async () => {
    fetchMock.mockResolvedValue(fetchResponse(200, cardPaymentResponse));

    const result = await service.createMercadoPagoCardPayment(
      'purchase-1',
      cardPaymentBody,
      'payment-key-1',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3102/purchases/purchase-1/mercado-pago/card-payment',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': 'payment-key-1',
        },
        body: JSON.stringify(cardPaymentBody),
      },
    );
    expect(result).toEqual(cardPaymentResponse);
  });

  it('forwards user credit balance requests to billing', async () => {
    fetchMock.mockResolvedValue(fetchResponse(200, creditBalanceResponse));

    const result = await service.getUserCreditBalance('user-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3102/users/user-1/credits',
      undefined,
    );
    expect(result).toEqual(creditBalanceResponse);
  });

  it('forwards simulated payment confirmations to billing', async () => {
    fetchMock.mockResolvedValue(fetchResponse(200, simulatePaymentResponse));

    const result = await service.simulatePayment('purchase-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3102/purchases/purchase-1/simulate-payment',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );
    expect(result).toEqual(simulatePaymentResponse);
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

  it('normalizes Mercado Pago query data.id into the proxied webhook data object', async () => {
    const response = {
      received: true,
      processed: false,
    };

    fetchMock.mockResolvedValue(fetchResponse(200, response));

    await service.handleMercadoPagoWebhook(
      {
        type: 'payment',
      },
      {
        'x-request-id': 'request-1',
      },
      {
        'data.id': 'payment-1',
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3102/payments/mercado-pago/webhook',
      expect.objectContaining({
        body: JSON.stringify({
          'data.id': 'payment-1',
          type: 'payment',
          data: {
            id: 'payment-1',
          },
        }),
      }),
    );
  });
});

describe('Api Gateway AppService capture records', () => {
  let service: AppService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = new AppService();
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts capture records through capture-service', async () => {
    fetchMock.mockResolvedValue(fetchResponse(201, startCaptureResponse));

    const result = await service.startCapture(startCaptureBody);

    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:3103/records', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(startCaptureBody),
    });
    expect(result).toEqual(startCaptureResponse);
  });

  it('reads live capture frames through capture-service', async () => {
    fetchMock.mockResolvedValue(fetchResponse(200, captureFrameResponse));

    const result = await service.getCaptureFrame('record-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3103/records/record-1/frame',
      undefined,
    );
    expect(result).toEqual(captureFrameResponse);
  });

  it('reads capture record details through capture-service', async () => {
    fetchMock.mockResolvedValue(
      fetchResponse(200, captureRecordDetailsResponse),
    );

    const result = await service.getCaptureRecord('record-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3103/records/record-1',
      undefined,
    );
    expect(result).toEqual(captureRecordDetailsResponse);
  });

  it('lists capture records through capture-service', async () => {
    fetchMock.mockResolvedValue(fetchResponse(200, listCaptureRecordsResponse));

    const result = await service.listCaptureRecords('user-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3103/users/user-1/records',
      undefined,
    );
    expect(result).toEqual(listCaptureRecordsResponse);
  });

  it('sends browser input through capture-service', async () => {
    fetchMock.mockResolvedValue(fetchResponse(202, { accepted: true }));

    const result = await service.sendCaptureInput('record-1', browserInputBody);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3103/records/record-1/input',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(browserInputBody),
      },
    );
    expect(result).toEqual({ accepted: true });
  });

  it('sends direct navigation through capture-service', async () => {
    fetchMock.mockResolvedValue(fetchResponse(202, navigateResponse));

    const result = await service.navigateCapture('record-1', navigateBody);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3103/records/record-1/navigate',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(navigateBody),
      },
    );
    expect(result).toEqual(navigateResponse);
  });

  it('creates screenshots through capture-service', async () => {
    fetchMock.mockResolvedValue(fetchResponse(201, screenshotResponse));

    const result = await service.captureScreenshot('record-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3103/records/record-1/screenshots',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );
    expect(result).toEqual(screenshotResponse);
  });

  it('starts and stops video through capture-service', async () => {
    fetchMock
      .mockResolvedValueOnce(fetchResponse(202, videoStateResponse))
      .mockResolvedValueOnce(
        fetchResponse(201, { ...videoStateResponse, recording: false }),
      );

    await expect(service.startCaptureVideo('record-1')).resolves.toEqual(
      videoStateResponse,
    );
    await expect(service.stopCaptureVideo('record-1')).resolves.toEqual({
      ...videoStateResponse,
      recording: false,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:3103/records/record-1/video/start',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:3103/records/record-1/video/stop',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );
  });

  it('completes capture records through capture-service', async () => {
    fetchMock.mockResolvedValue(fetchResponse(200, completeCaptureResponse));

    const result = await service.completeCapture('record-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3103/records/record-1/complete',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );
    expect(result).toEqual(completeCaptureResponse);
  });

  it('preserves capture-service client errors', async () => {
    const payload = {
      statusCode: 409,
      message: 'Sessao de captura nao esta ativa',
    };

    fetchMock.mockResolvedValue(fetchResponse(409, payload));

    await expectHttpException(
      service.getCaptureFrame('record-1'),
      409,
      payload,
    );
  });
});
