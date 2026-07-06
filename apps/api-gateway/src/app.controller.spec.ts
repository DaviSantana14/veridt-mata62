import { BadRequestException } from '@nestjs/common';
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
  SimulatePaymentResponse,
  StartCaptureRequest,
  StartCaptureSessionResponse,
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
  type: 'click',
  x: 100,
  y: 120,
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

describe('Api Gateway AppController capture records', () => {
  let controller: AppController;
  let appService: {
    startCapture: jest.Mock;
    getCaptureRecord: jest.Mock;
    getCaptureFrame: jest.Mock;
    sendCaptureInput: jest.Mock;
    navigateCapture: jest.Mock;
    captureScreenshot: jest.Mock;
    startCaptureVideo: jest.Mock;
    stopCaptureVideo: jest.Mock;
    completeCapture: jest.Mock;
  };

  beforeEach(() => {
    appService = {
      startCapture: jest.fn().mockResolvedValue(startCaptureResponse),
      getCaptureRecord: jest
        .fn()
        .mockResolvedValue(captureRecordDetailsResponse),
      getCaptureFrame: jest.fn().mockResolvedValue(captureFrameResponse),
      sendCaptureInput: jest.fn().mockResolvedValue({ accepted: true }),
      navigateCapture: jest.fn().mockResolvedValue(navigateResponse),
      captureScreenshot: jest.fn().mockResolvedValue(screenshotResponse),
      startCaptureVideo: jest.fn().mockResolvedValue(videoStateResponse),
      stopCaptureVideo: jest
        .fn()
        .mockResolvedValue({ ...videoStateResponse, recording: false }),
      completeCapture: jest.fn().mockResolvedValue(completeCaptureResponse),
    };
    controller = new AppController(appService as unknown as AppService);
  });

  it('starts capture records through the service', async () => {
    await expect(controller.startCapture(startCaptureBody)).resolves.toEqual(
      startCaptureResponse,
    );

    expect(appService.startCapture).toHaveBeenCalledWith(startCaptureBody);
  });

  it('proxies browser frame reads', async () => {
    await expect(controller.getCaptureRecord('record-1')).resolves.toEqual(
      captureRecordDetailsResponse,
    );
    await expect(controller.getCaptureFrame('record-1')).resolves.toEqual(
      captureFrameResponse,
    );

    expect(appService.getCaptureRecord).toHaveBeenCalledWith('record-1');
    expect(appService.getCaptureFrame).toHaveBeenCalledWith('record-1');
  });

  it('proxies browser input commands', async () => {
    await expect(
      controller.sendCaptureInput('record-1', browserInputBody),
    ).resolves.toEqual({ accepted: true });

    expect(appService.sendCaptureInput).toHaveBeenCalledWith(
      'record-1',
      browserInputBody,
    );
  });

  it('proxies direct browser navigation commands', async () => {
    await expect(
      controller.navigateCapture('record-1', navigateBody),
    ).resolves.toEqual(navigateResponse);

    expect(appService.navigateCapture).toHaveBeenCalledWith(
      'record-1',
      navigateBody,
    );
  });

  it('proxies asset and completion commands', async () => {
    await expect(controller.captureScreenshot('record-1')).resolves.toEqual(
      screenshotResponse,
    );
    await expect(controller.startCaptureVideo('record-1')).resolves.toEqual(
      videoStateResponse,
    );
    await expect(controller.stopCaptureVideo('record-1')).resolves.toEqual({
      ...videoStateResponse,
      recording: false,
    });
    await expect(controller.completeCapture('record-1')).resolves.toEqual(
      completeCaptureResponse,
    );

    expect(appService.captureScreenshot).toHaveBeenCalledWith('record-1');
    expect(appService.startCaptureVideo).toHaveBeenCalledWith('record-1');
    expect(appService.stopCaptureVideo).toHaveBeenCalledWith('record-1');
    expect(appService.completeCapture).toHaveBeenCalledWith('record-1');
  });
});
