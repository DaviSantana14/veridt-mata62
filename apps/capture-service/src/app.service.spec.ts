import {
  ConflictException,
  NotFoundException,
  type INestApplication,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import type {
  BrowserInputRequest,
  CaptureAssetType,
  CaptureRecordDetailsResponse,
} from '@veridit/contracts';
import { AppService } from './app.service';
import { CaptureSessionManagerService } from './capture/capture-session-manager.service';
import { CaptureStorageService } from './capture/capture-storage.service';
import { UrlPolicyService } from './capture/url-policy.service';
import { BrowserInputDto } from './dto/browser-input.dto';
import { StartCaptureDto } from './dto/start-capture.dto';
import { CaptureEventsPublisher } from './messaging/capture-events.publisher';
import { PrismaService } from './prisma/prisma.service';

jest.mock('./prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

type PrismaMock = ReturnType<typeof createPrismaMock>;
type EventsPublisherMock = ReturnType<typeof createEventsPublisherMock>;
type UrlPolicyMock = ReturnType<typeof createUrlPolicyMock>;
type StorageMock = ReturnType<typeof createStorageMock>;
type SessionManagerMock = ReturnType<typeof createSessionManagerMock>;

const startedAt = new Date('2026-01-02T03:04:05.000Z');
const finishedAt = new Date('2026-01-02T03:08:09.000Z');
const createdAt = new Date('2026-01-02T03:05:06.000Z');

function createPrismaMock() {
  return {
    contentRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    captureAsset: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
}

function createEventsPublisherMock() {
  return {
    publishCaptureCompleted: jest.fn(),
  };
}

function createUrlPolicyMock() {
  return {
    validatePublicHttpUrl: jest
      .fn()
      .mockResolvedValue('https://example.com/path'),
  };
}

function createStorageMock() {
  return {
    createAssetPath: jest.fn(),
    getFileSize: jest.fn(),
    openAsset: jest.fn(),
  };
}

function createSessionManagerMock() {
  return {
    startSession: jest.fn(),
    getFrame: jest.fn(),
    sendInput: jest.fn(),
    navigate: jest.fn(),
    captureScreenshot: jest.fn(),
    startVideo: jest.fn(),
    stopVideo: jest.fn(),
    closeSession: jest.fn(),
  };
}

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'record-1',
    userId: 'user-1',
    title: 'Captura',
    siteUrl: 'https://example.com/path',
    status: 'STARTED',
    startedAt,
    finishedAt: null,
    ...overrides,
  };
}

function makeAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 'asset-1',
    recordId: 'record-1',
    type: 'IMAGE' as CaptureAssetType,
    fileName: 'screenshot.png',
    fileSizeBytes: 123,
    sourceUrl: 'https://example.com/current',
    createdAt,
    ...overrides,
  };
}

describe('AppService capture records', () => {
  let app: INestApplication;
  let service: AppService;
  let prisma: PrismaMock;
  let eventsPublisher: EventsPublisherMock;
  let urlPolicy: UrlPolicyMock;
  let storage: StorageMock;
  let sessionManager: SessionManagerMock;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));

    prisma = createPrismaMock();
    eventsPublisher = createEventsPublisherMock();
    urlPolicy = createUrlPolicyMock();
    storage = createStorageMock();
    sessionManager = createSessionManagerMock();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: CaptureEventsPublisher,
          useValue: eventsPublisher,
        },
        {
          provide: UrlPolicyService,
          useValue: urlPolicy,
        },
        {
          provide: CaptureStorageService,
          useValue: storage,
        },
        {
          provide: CaptureSessionManagerService,
          useValue: sessionManager,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    service = moduleRef.get<AppService>(AppService);
  });

  afterEach(async () => {
    await app.close();
    jest.useRealTimers();
  });

  it('validates start capture DTO with optional empty title and local URLs', async () => {
    const dto = Object.assign(new StartCaptureDto(), {
      userId: 'user-1',
      siteUrl: 'http://localhost:3000',
      title: '',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('validates browser input DTO fields conditionally by type', async () => {
    const click = Object.assign(new BrowserInputDto(), {
      type: 'click',
      x: 1,
      y: 2,
    });
    const invalidText = Object.assign(new BrowserInputDto(), {
      type: 'text',
      value: '',
    });

    await expect(validate(click)).resolves.toHaveLength(0);
    await expect(validate(invalidText)).resolves.not.toHaveLength(0);
  });

  it('starts a record with a generated title and browser session', async () => {
    prisma.contentRecord.create.mockResolvedValue(
      makeRecord({
        title: 'Captura - example.com - 2026-01-02 03:04',
      }),
    );
    sessionManager.startSession.mockResolvedValue({
      viewport: {
        width: 1366,
        height: 768,
      },
    });

    const result = await service.startRecord({
      userId: 'user-1',
      siteUrl: ' HTTPS://Example.com/path ',
      title: ' ',
    });

    expect(urlPolicy.validatePublicHttpUrl).toHaveBeenCalledWith(
      ' HTTPS://Example.com/path ',
    );
    expect(prisma.contentRecord.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        title: 'Captura - example.com - 2026-01-02 03:04',
        siteUrl: 'https://example.com/path',
        status: 'STARTED',
      },
    });
    expect(sessionManager.startSession).toHaveBeenCalledWith({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com/path',
    });
    expect(result).toEqual({
      id: 'record-1',
      userId: 'user-1',
      title: 'Captura - example.com - 2026-01-02 03:04',
      siteUrl: 'https://example.com/path',
      status: 'STARTED',
      startedAt: '2026-01-02T03:04:05.000Z',
      finishedAt: undefined,
      viewport: {
        width: 1366,
        height: 768,
      },
    });
  });

  it('returns a mapped content record with real asset counters', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    prisma.captureAsset.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

    const expected: CaptureRecordDetailsResponse = {
      id: 'record-1',
      userId: 'user-1',
      title: 'Captura',
      siteUrl: 'https://example.com/path',
      status: 'STARTED',
      startedAt: '2026-01-02T03:04:05.000Z',
      finishedAt: undefined,
      imageCount: 3,
      videoCount: 2,
    };

    await expect(service.getRecord('record-1')).resolves.toEqual(expected);
    expect(prisma.captureAsset.count).toHaveBeenNthCalledWith(1, {
      where: {
        recordId: 'record-1',
        type: 'IMAGE',
      },
    });
    expect(prisma.captureAsset.count).toHaveBeenNthCalledWith(2, {
      where: {
        recordId: 'record-1',
        type: 'VIDEO',
      },
    });
  });

  it('lists records for a user ordered by start date descending', async () => {
    prisma.contentRecord.findMany.mockResolvedValue([
      makeRecord({
        id: 'record-2',
        title: 'Registro mais recente',
        status: 'COMPLETED',
        details: 'Concluido com evidencias.',
        startedAt: new Date('2026-07-05T12:00:00.000Z'),
        finishedAt: new Date('2026-07-05T12:05:00.000Z'),
        assets: [{ type: 'IMAGE' }, { type: 'VIDEO' }],
      }),
      makeRecord({
        id: 'record-1',
        title: 'Registro antigo',
        details: null,
        startedAt: new Date('2026-07-04T10:00:00.000Z'),
        finishedAt: null,
        assets: [],
      }),
    ]);

    await expect(service.listRecordsForUser('user-1')).resolves.toEqual({
      userId: 'user-1',
      records: [
        expect.objectContaining({
          id: 'record-2',
          title: 'Registro mais recente',
          status: 'COMPLETED',
          details: 'Concluido com evidencias.',
          imageCount: 1,
          videoCount: 1,
        }),
        expect.objectContaining({
          id: 'record-1',
          title: 'Registro antigo',
          status: 'STARTED',
          details: undefined,
          imageCount: 0,
          videoCount: 0,
        }),
      ],
    });

    expect(prisma.contentRecord.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { startedAt: 'desc' },
      include: { assets: { select: { type: true } } },
    });
  });

  it('lists capture assets for a record ordered by creation date', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    prisma.captureAsset.findMany.mockResolvedValue([
      makeAsset(),
      makeAsset({
        id: 'asset-2',
        type: 'VIDEO',
        fileName: 'video.webm',
        fileSizeBytes: 456,
        sourceUrl: null,
        createdAt: new Date('2026-01-02T03:06:07.000Z'),
      }),
    ]);

    await expect(service.listAssets('record-1')).resolves.toEqual({
      recordId: 'record-1',
      assets: [
        {
          id: 'asset-1',
          recordId: 'record-1',
          type: 'IMAGE',
          fileName: 'screenshot.png',
          fileSizeBytes: 123,
          sourceUrl: 'https://example.com/current',
          createdAt: '2026-01-02T03:05:06.000Z',
        },
        {
          id: 'asset-2',
          recordId: 'record-1',
          type: 'VIDEO',
          fileName: 'video.webm',
          fileSizeBytes: 456,
          sourceUrl: undefined,
          createdAt: '2026-01-02T03:06:07.000Z',
        },
      ],
    });
    expect(prisma.captureAsset.findMany).toHaveBeenCalledWith({
      where: { recordId: 'record-1' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('opens a capture asset download for the requested record', async () => {
    const stream = {} as NodeJS.ReadableStream;

    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    prisma.captureAsset.findUnique.mockResolvedValue(makeAsset());
    storage.openAsset.mockResolvedValue({
      stream,
      size: 123,
    });

    await expect(
      service.getAssetDownload('record-1', 'asset-1'),
    ).resolves.toEqual({
      stream,
      fileName: 'screenshot.png',
      contentType: 'image/png',
      contentLength: 123,
    });
    expect(prisma.captureAsset.findUnique).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
    });
    expect(storage.openAsset).toHaveBeenCalledWith(
      'record-1',
      'screenshot.png',
    );
  });

  it('opens video capture asset downloads with the video content type', async () => {
    const stream = {} as NodeJS.ReadableStream;

    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    prisma.captureAsset.findUnique.mockResolvedValue(
      makeAsset({
        type: 'VIDEO',
        fileName: 'video.webm',
      }),
    );
    storage.openAsset.mockResolvedValue({
      stream,
      size: 456,
    });

    await expect(
      service.getAssetDownload('record-1', 'asset-1'),
    ).resolves.toMatchObject({
      fileName: 'video.webm',
      contentType: 'video/webm',
      contentLength: 456,
    });
  });

  it('throws not found when listing assets for a missing record', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(null);

    await expect(service.listAssets('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.captureAsset.findMany).not.toHaveBeenCalled();
  });

  it('throws not found when downloading assets for a missing record', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(null);

    await expect(
      service.getAssetDownload('missing', 'asset-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.captureAsset.findUnique).not.toHaveBeenCalled();
  });

  it('rejects downloads for assets from another record', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    prisma.captureAsset.findUnique.mockResolvedValue(
      makeAsset({ recordId: 'other-record' }),
    );

    await expect(
      service.getAssetDownload('record-1', 'asset-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.openAsset).not.toHaveBeenCalled();
  });

  it('throws not found for missing records', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(null);

    await expect(service.getRecord('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('gets a frame for a started record', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    sessionManager.getFrame.mockResolvedValue({
      imageBase64: 'abc',
      currentUrl: 'https://example.com/current',
      capturedAt: '2026-01-02T03:05:00.000Z',
      viewport: {
        width: 1366,
        height: 768,
      },
    });

    await expect(service.getFrame('record-1')).resolves.toEqual({
      recordId: 'record-1',
      mimeType: 'image/jpeg',
      imageBase64: 'abc',
      currentUrl: 'https://example.com/current',
      capturedAt: '2026-01-02T03:05:00.000Z',
      viewport: {
        width: 1366,
        height: 768,
      },
    });
  });

  it('sends input and returns the current URL', async () => {
    const input: BrowserInputRequest = { type: 'click', x: 10, y: 20 };

    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    sessionManager.sendInput.mockResolvedValue('https://example.com/current');

    await expect(service.sendInput('record-1', input)).resolves.toEqual({
      accepted: true,
      currentUrl: 'https://example.com/current',
    });
  });

  it('navigates a started session after URL policy validation', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    urlPolicy.validatePublicHttpUrl.mockResolvedValue('https://www.ufba.br/');
    sessionManager.navigate.mockResolvedValue('https://www.ufba.br/');

    await expect(
      service.navigate('record-1', { siteUrl: ' https://www.ufba.br ' }),
    ).resolves.toEqual({
      accepted: true,
      currentUrl: 'https://www.ufba.br/',
    });

    expect(urlPolicy.validatePublicHttpUrl).toHaveBeenCalledWith(
      ' https://www.ufba.br ',
    );
    expect(sessionManager.navigate).toHaveBeenCalledWith(
      'record-1',
      'https://www.ufba.br/',
    );
  });

  it('translates missing sessions during direct navigation to conflict', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    urlPolicy.validatePublicHttpUrl.mockResolvedValue('https://www.ufba.br/');
    sessionManager.navigate.mockRejectedValue(
      new NotFoundException('Capture session not found'),
    );

    await expect(
      service.navigate('record-1', { siteUrl: 'https://www.ufba.br' }),
    ).rejects.toMatchObject({
      message: 'Sessao de captura nao esta ativa',
    });
  });

  it('captures screenshots and persists image assets', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    storage.createAssetPath.mockResolvedValue({
      fileName: 'screenshot.png',
      filePath: 'storage/screenshot.png',
    });
    storage.getFileSize.mockResolvedValue(123);
    sessionManager.getFrame.mockResolvedValue({
      currentUrl: 'https://example.com/current',
    });
    prisma.captureAsset.create.mockResolvedValue(makeAsset());

    await expect(service.captureScreenshot('record-1')).resolves.toEqual({
      id: 'asset-1',
      recordId: 'record-1',
      type: 'IMAGE',
      fileName: 'screenshot.png',
      fileSizeBytes: 123,
      sourceUrl: 'https://example.com/current',
      createdAt: '2026-01-02T03:05:06.000Z',
    });
    expect(storage.createAssetPath).toHaveBeenCalledWith('record-1', 'IMAGE');
    expect(sessionManager.captureScreenshot).toHaveBeenCalledWith(
      'record-1',
      'storage/screenshot.png',
    );
    expect(prisma.captureAsset.create).toHaveBeenCalledWith({
      data: {
        recordId: 'record-1',
        type: 'IMAGE',
        fileName: 'screenshot.png',
        fileSizeBytes: 123,
        sourceUrl: 'https://example.com/current',
      },
    });
  });

  it('starts and stops video while persisting the completed asset', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    storage.createAssetPath.mockResolvedValue({
      fileName: 'video.webm',
      filePath: 'storage/video.webm',
    });
    storage.getFileSize.mockResolvedValue(456);
    sessionManager.getFrame.mockResolvedValue({
      currentUrl: 'https://example.com/current',
    });
    prisma.captureAsset.create.mockResolvedValue(
      makeAsset({
        id: 'video-asset-1',
        type: 'VIDEO',
        fileName: 'video.webm',
        fileSizeBytes: 456,
      }),
    );

    await expect(service.startVideo('record-1')).resolves.toEqual({
      recording: true,
    });
    expect(sessionManager.startVideo).toHaveBeenCalledWith(
      'record-1',
      'storage/video.webm',
    );

    await expect(service.stopVideo('record-1')).resolves.toEqual({
      recording: false,
      asset: {
        id: 'video-asset-1',
        recordId: 'record-1',
        type: 'VIDEO',
        fileName: 'video.webm',
        fileSizeBytes: 456,
        sourceUrl: 'https://example.com/current',
        createdAt: '2026-01-02T03:05:06.000Z',
      },
    });
  });

  it('completes a started record, closes the session and publishes an event', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    prisma.contentRecord.update.mockResolvedValue(
      makeRecord({
        status: 'COMPLETED',
        finishedAt,
      }),
    );
    prisma.captureAsset.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    await expect(service.completeRecord('record-1')).resolves.toEqual({
      id: 'record-1',
      userId: 'user-1',
      title: 'Captura',
      siteUrl: 'https://example.com/path',
      status: 'COMPLETED',
      startedAt: '2026-01-02T03:04:05.000Z',
      finishedAt: '2026-01-02T03:08:09.000Z',
      imageCount: 2,
      videoCount: 1,
    });
    expect(sessionManager.closeSession).toHaveBeenCalledWith('record-1');
    expect(eventsPublisher.publishCaptureCompleted).toHaveBeenCalledWith({
      recordId: 'record-1',
      userId: 'user-1',
      title: 'Captura',
      siteUrl: 'https://example.com/path',
      imageCount: 2,
      videoCount: 1,
      occurredAt: '2026-01-02T03:08:09.000Z',
    });
  });

  it('completes a started record when closeSession finds no active session', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    sessionManager.closeSession.mockRejectedValue(
      new Error('browser has been closed'),
    );
    prisma.contentRecord.update.mockResolvedValue(
      makeRecord({
        status: 'COMPLETED',
        finishedAt,
      }),
    );
    prisma.captureAsset.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(service.completeRecord('record-1')).resolves.toEqual({
      id: 'record-1',
      userId: 'user-1',
      title: 'Captura',
      siteUrl: 'https://example.com/path',
      status: 'COMPLETED',
      startedAt: '2026-01-02T03:04:05.000Z',
      finishedAt: '2026-01-02T03:08:09.000Z',
      imageCount: 1,
      videoCount: 0,
    });
    expect(sessionManager.closeSession).toHaveBeenCalledWith('record-1');
    expect(prisma.contentRecord.update).toHaveBeenCalledWith({
      where: {
        id: 'record-1',
      },
      data: {
        status: 'COMPLETED',
        finishedAt: startedAt,
      },
    });
    expect(eventsPublisher.publishCaptureCompleted).toHaveBeenCalledWith({
      recordId: 'record-1',
      userId: 'user-1',
      title: 'Captura',
      siteUrl: 'https://example.com/path',
      imageCount: 1,
      videoCount: 0,
      occurredAt: '2026-01-02T03:08:09.000Z',
    });
  });

  it('persists an active video before completing a record', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    storage.createAssetPath.mockResolvedValue({
      fileName: 'video.webm',
      filePath: 'storage/video.webm',
    });
    storage.getFileSize.mockResolvedValue(456);
    sessionManager.getFrame.mockResolvedValue({
      currentUrl: 'https://example.com/current',
    });
    prisma.captureAsset.create.mockResolvedValue(
      makeAsset({
        id: 'video-asset-1',
        type: 'VIDEO',
        fileName: 'video.webm',
        fileSizeBytes: 456,
      }),
    );
    prisma.contentRecord.update.mockResolvedValue(
      makeRecord({
        status: 'COMPLETED',
        finishedAt,
      }),
    );
    prisma.captureAsset.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    await service.startVideo('record-1');

    await expect(service.completeRecord('record-1')).resolves.toMatchObject({
      id: 'record-1',
      status: 'COMPLETED',
      imageCount: 0,
      videoCount: 1,
    });
    expect(sessionManager.stopVideo).toHaveBeenCalledWith('record-1');
    expect(prisma.captureAsset.create).toHaveBeenCalledWith({
      data: {
        recordId: 'record-1',
        type: 'VIDEO',
        fileName: 'video.webm',
        fileSizeBytes: 456,
        sourceUrl: 'https://example.com/current',
      },
    });
    expect(sessionManager.closeSession).toHaveBeenCalledWith('record-1');
  });

  it('rejects completed records for active capture operations', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(
      makeRecord({ status: 'COMPLETED' }),
    );

    await expect(service.getFrame('record-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('translates missing started sessions to conflict', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    sessionManager.getFrame.mockRejectedValue(
      new NotFoundException('Capture session not found'),
    );

    await expect(service.getFrame('record-1')).rejects.toMatchObject({
      message: 'Sessao de captura nao esta ativa',
    });
  });

  it('completes a started record with pending video when the session is inactive', async () => {
    prisma.contentRecord.findUnique.mockResolvedValue(makeRecord());
    storage.createAssetPath.mockResolvedValue({
      fileName: 'video.webm',
      filePath: 'storage/video.webm',
    });
    sessionManager.stopVideo.mockRejectedValue(
      new Error('Target page has been closed'),
    );
    sessionManager.closeSession.mockRejectedValue(
      new Error('context closed'),
    );
    prisma.contentRecord.update.mockResolvedValue(
      makeRecord({
        status: 'COMPLETED',
        finishedAt,
      }),
    );
    prisma.captureAsset.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await service.startVideo('record-1');

    await expect(service.completeRecord('record-1')).resolves.toMatchObject({
      id: 'record-1',
      status: 'COMPLETED',
      imageCount: 1,
      videoCount: 0,
    });
    expect(sessionManager.stopVideo).toHaveBeenCalledWith('record-1');
    expect(prisma.captureAsset.create).not.toHaveBeenCalled();
    expect(prisma.contentRecord.update).toHaveBeenCalledWith({
      where: {
        id: 'record-1',
      },
      data: {
        status: 'COMPLETED',
        finishedAt: startedAt,
      },
    });
  });
});
