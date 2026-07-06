import type {
  BrowserInputResponse,
  CaptureAssetResponse,
  CaptureFrameResponse,
  CaptureRecordDetailsResponse,
  CaptureVideoStateResponse,
  CompleteCaptureResponse,
  ContentRecordResponse,
  HealthResponse,
  NavigateCaptureResponse,
  StartCaptureSessionResponse,
} from '@veridit/contracts';
import { AppController } from './app.controller';
import type { AppService } from './app.service';
import type { BrowserInputDto } from './dto/browser-input.dto';
import type { MockCaptureDto } from './dto/mock-capture.dto';
import type { NavigateCaptureDto } from './dto/navigate-capture.dto';
import type { StartCaptureDto } from './dto/start-capture.dto';

jest.mock('./app.service', () => ({
  AppService: class AppService {},
}));

const healthResponse: HealthResponse = {
  service: 'capture-service',
  status: 'ok',
  timestamp: '2026-01-02T03:04:05.000Z',
};

const contentRecordResponse: ContentRecordResponse = {
  id: 'record-1',
  userId: 'user-1',
  title: 'Captura',
  siteUrl: 'https://example.com',
  status: 'STARTED',
  startedAt: '2026-01-02T03:04:05.000Z',
};

const recordDetailsResponse: CaptureRecordDetailsResponse = {
  ...contentRecordResponse,
  imageCount: 2,
  videoCount: 1,
};

const startResponse: StartCaptureSessionResponse = {
  ...contentRecordResponse,
  viewport: {
    width: 1366,
    height: 768,
  },
};

const frameResponse: CaptureFrameResponse = {
  recordId: 'record-1',
  mimeType: 'image/jpeg',
  imageBase64: 'abc',
  currentUrl: 'https://example.com/current',
  capturedAt: '2026-01-02T03:05:00.000Z',
  viewport: {
    width: 1366,
    height: 768,
  },
};

const inputResponse: BrowserInputResponse = {
  accepted: true,
  currentUrl: 'https://example.com/current',
};

const navigateResponse: NavigateCaptureResponse = {
  accepted: true,
  currentUrl: 'https://www.ufba.br/',
};

const assetResponse: CaptureAssetResponse = {
  id: 'asset-1',
  recordId: 'record-1',
  type: 'IMAGE',
  fileName: 'screenshot.png',
  fileSizeBytes: 123,
  sourceUrl: 'https://example.com/current',
  createdAt: '2026-01-02T03:05:06.000Z',
};

const videoResponse: CaptureVideoStateResponse = {
  recording: true,
};

const completeResponse: CompleteCaptureResponse = {
  ...contentRecordResponse,
  status: 'COMPLETED',
  finishedAt: '2026-01-02T03:08:09.000Z',
  imageCount: 1,
  videoCount: 0,
};

describe('Capture AppController', () => {
  let controller: AppController;
  let appService: {
    getHealth: jest.Mock;
    createMockRecord: jest.Mock;
    startRecord: jest.Mock;
    getRecord: jest.Mock;
    getFrame: jest.Mock;
    sendInput: jest.Mock;
    navigate: jest.Mock;
    captureScreenshot: jest.Mock;
    startVideo: jest.Mock;
    stopVideo: jest.Mock;
    completeRecord: jest.Mock;
  };

  beforeEach(() => {
    appService = {
      getHealth: jest.fn().mockReturnValue(healthResponse),
      createMockRecord: jest.fn().mockResolvedValue(contentRecordResponse),
      startRecord: jest.fn().mockResolvedValue(startResponse),
      getRecord: jest.fn().mockResolvedValue(recordDetailsResponse),
      getFrame: jest.fn().mockResolvedValue(frameResponse),
      sendInput: jest.fn().mockResolvedValue(inputResponse),
      navigate: jest.fn().mockResolvedValue(navigateResponse),
      captureScreenshot: jest.fn().mockResolvedValue(assetResponse),
      startVideo: jest.fn().mockResolvedValue(videoResponse),
      stopVideo: jest.fn().mockResolvedValue({
        recording: false,
        asset: assetResponse,
      }),
      completeRecord: jest.fn().mockResolvedValue(completeResponse),
    };
    controller = new AppController(appService as unknown as AppService);
  });

  it('keeps health and mock record routes delegated to the service', async () => {
    const body: MockCaptureDto = {
      userId: 'user-1',
      title: 'Mock',
      siteUrl: 'https://example.com',
    };

    expect(controller.getHealth()).toEqual(healthResponse);
    await expect(controller.createMockRecord(body)).resolves.toEqual(
      contentRecordResponse,
    );
    expect(appService.createMockRecord).toHaveBeenCalledWith(body);
  });

  it('delegates record lifecycle routes to the service', async () => {
    const body: StartCaptureDto = {
      userId: 'user-1',
      siteUrl: 'https://example.com',
    };

    await expect(controller.startRecord(body)).resolves.toEqual(startResponse);
    await expect(controller.getRecord('record-1')).resolves.toEqual(
      recordDetailsResponse,
    );
    await expect(controller.getFrame('record-1')).resolves.toEqual(
      frameResponse,
    );
    await expect(controller.captureScreenshot('record-1')).resolves.toEqual(
      assetResponse,
    );
    await expect(controller.startVideo('record-1')).resolves.toEqual(
      videoResponse,
    );
    await expect(controller.stopVideo('record-1')).resolves.toEqual({
      recording: false,
      asset: assetResponse,
    });
    await expect(controller.completeRecord('record-1')).resolves.toEqual(
      completeResponse,
    );

    expect(appService.startRecord).toHaveBeenCalledWith(body);
    expect(appService.getRecord).toHaveBeenCalledWith('record-1');
    expect(appService.getFrame).toHaveBeenCalledWith('record-1');
    expect(appService.captureScreenshot).toHaveBeenCalledWith('record-1');
    expect(appService.startVideo).toHaveBeenCalledWith('record-1');
    expect(appService.stopVideo).toHaveBeenCalledWith('record-1');
    expect(appService.completeRecord).toHaveBeenCalledWith('record-1');
  });

  it('delegates browser input to the service', async () => {
    const input: BrowserInputDto = { type: 'text', value: 'hello' };

    await expect(controller.sendInput('record-1', input)).resolves.toEqual(
      inputResponse,
    );

    expect(appService.sendInput).toHaveBeenCalledWith('record-1', input);
  });

  it('delegates direct navigation to the service', async () => {
    const input: NavigateCaptureDto = { siteUrl: 'https://www.ufba.br' };

    await expect(controller.navigate('record-1', input)).resolves.toEqual(
      navigateResponse,
    );

    expect(appService.navigate).toHaveBeenCalledWith('record-1', input);
  });
});
