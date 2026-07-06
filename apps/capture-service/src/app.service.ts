import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type BrowserInputRequest,
  type BrowserInputResponse,
  type CaptureAssetResponse,
  type CaptureAssetType,
  type CaptureFrameResponse,
  type CaptureRecordDetailsResponse,
  type CaptureRecordListItemResponse,
  type CaptureRecordStatus,
  type CaptureVideoStateResponse,
  type CompleteCaptureResponse,
  type ContentRecordResponse,
  type HealthResponse,
  type ListCaptureAssetsResponse,
  type ListCaptureRecordsResponse,
  type NavigateCaptureRequest,
  type NavigateCaptureResponse,
  type StartCaptureRequest,
  type StartCaptureSessionResponse,
} from '@veridit/contracts';
import type { ReadStream } from 'node:fs';
import { CaptureSessionManagerService } from './capture/capture-session-manager.service';
import { CaptureStorageService } from './capture/capture-storage.service';
import { UrlPolicyService } from './capture/url-policy.service';
import { CaptureEventsPublisher } from './messaging/capture-events.publisher';
import { PrismaService } from './prisma/prisma.service';

interface StoredContentRecord {
  id: string;
  userId: string;
  title: string;
  siteUrl: string;
  status: CaptureRecordStatus;
  startedAt: Date;
  finishedAt: Date | null;
}

interface StoredListedContentRecord extends StoredContentRecord {
  details: string | null;
  assets: Array<{ type: CaptureAssetType }>;
}

interface StoredCaptureAsset {
  id: string;
  recordId: string;
  type: CaptureAssetType;
  fileName: string;
  fileSizeBytes: number | null;
  sourceUrl: string | null;
  createdAt: Date;
}

interface PendingVideoAsset {
  fileName: string;
  filePath: string;
}

export interface CaptureAssetDownload {
  stream: ReadStream;
  fileName: string;
  contentType: string;
  contentLength?: number;
}

@Injectable()
export class AppService {
  private readonly pendingVideoAssets = new Map<string, PendingVideoAsset>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsPublisher: CaptureEventsPublisher,
    private readonly urlPolicy: UrlPolicyService,
    private readonly storage: CaptureStorageService,
    private readonly sessionManager: CaptureSessionManagerService,
  ) {}

  getHealth(): HealthResponse {
    return {
      service: 'capture-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async createMockRecord(
    body: StartCaptureRequest,
  ): Promise<ContentRecordResponse> {
    const finishedAt = new Date();
    const record = await this.prisma.contentRecord.create({
      data: {
        userId: body.userId,
        title: body.title ?? this.getCaptureTitle(body.siteUrl),
        siteUrl: body.siteUrl,
        status: 'COMPLETED',
        finishedAt,
        details: 'Captura mock concluida pelo boilerplate.',
        assets: {
          create: [
            {
              type: 'IMAGE',
              fileName: 'mock-capture-001.png',
              fileSizeBytes: 128000,
              sourceUrl: body.siteUrl,
            },
          ],
        },
      },
    });

    this.eventsPublisher.publishCaptureCompleted({
      recordId: record.id,
      userId: record.userId,
      title: record.title,
      siteUrl: record.siteUrl,
      imageCount: 1,
      videoCount: 0,
      occurredAt: finishedAt.toISOString(),
    });

    return {
      id: record.id,
      userId: record.userId,
      title: record.title,
      siteUrl: record.siteUrl,
      status: 'COMPLETED',
      startedAt: record.startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    };
  }

  async startRecord(
    body: StartCaptureRequest,
  ): Promise<StartCaptureSessionResponse> {
    const siteUrl = await this.urlPolicy.validatePublicHttpUrl(body.siteUrl);
    const title = this.getCaptureTitle(siteUrl, body.title);
    const record = (await this.prisma.contentRecord.create({
      data: {
        userId: body.userId,
        title,
        siteUrl,
        status: 'STARTED',
      },
    })) as StoredContentRecord;
    const session = await this.sessionManager.startSession({
      recordId: record.id,
      userId: record.userId,
      siteUrl: record.siteUrl,
    });

    return {
      ...this.mapContentRecord(record),
      status: 'STARTED',
      viewport: session.viewport,
    };
  }

  async getRecord(recordId: string): Promise<CaptureRecordDetailsResponse> {
    const [record, assetCounts] = await Promise.all([
      this.findRecordOrThrow(recordId),
      this.getAssetCounts(recordId),
    ]);

    return {
      ...this.mapContentRecord(record),
      ...assetCounts,
    };
  }

  async listAssets(recordId: string): Promise<ListCaptureAssetsResponse> {
    await this.findRecordOrThrow(recordId);
    const assets = (await this.prisma.captureAsset.findMany({
      where: { recordId },
      orderBy: { createdAt: 'asc' },
    })) as StoredCaptureAsset[];

    return {
      recordId,
      assets: assets.map((asset) => this.mapCaptureAsset(asset)),
    };
  }

  async getAssetDownload(
    recordId: string,
    assetId: string,
  ): Promise<CaptureAssetDownload> {
    await this.findRecordOrThrow(recordId);
    const asset = (await this.prisma.captureAsset.findUnique({
      where: { id: assetId },
    })) as StoredCaptureAsset | null;

    if (!asset || asset.recordId !== recordId) {
      throw new NotFoundException('Arquivo de captura nao encontrado');
    }

    const openedAsset = await this.storage.openAsset(recordId, asset.fileName);

    return {
      stream: openedAsset.stream,
      fileName: asset.fileName,
      contentType: this.getAssetContentType(asset.type),
      contentLength: openedAsset.size,
    };
  }

  async listRecordsForUser(
    userId: string,
  ): Promise<ListCaptureRecordsResponse> {
    const records = (await this.prisma.contentRecord.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: { assets: { select: { type: true } } },
    })) as StoredListedContentRecord[];

    return {
      userId,
      records: records.map((record) => this.mapRecordListItem(record)),
    };
  }

  async getFrame(recordId: string): Promise<CaptureFrameResponse> {
    await this.findStartedRecordOrThrow(recordId);
    const frame = await this.withActiveSession(() =>
      this.sessionManager.getFrame(recordId),
    );

    return {
      recordId,
      mimeType: 'image/jpeg',
      ...frame,
    };
  }

  async sendInput(
    recordId: string,
    input: BrowserInputRequest,
  ): Promise<BrowserInputResponse> {
    await this.findStartedRecordOrThrow(recordId);
    const currentUrl = await this.withActiveSession(() =>
      this.sessionManager.sendInput(recordId, input),
    );

    return {
      accepted: true,
      currentUrl,
    };
  }

  async navigate(
    recordId: string,
    input: NavigateCaptureRequest,
  ): Promise<NavigateCaptureResponse> {
    await this.findStartedRecordOrThrow(recordId);
    const siteUrl = await this.urlPolicy.validatePublicHttpUrl(input.siteUrl);
    const currentUrl = await this.withActiveSession(() =>
      this.sessionManager.navigate(recordId, siteUrl),
    );

    return {
      accepted: true,
      currentUrl,
    };
  }

  async captureScreenshot(recordId: string): Promise<CaptureAssetResponse> {
    await this.findStartedRecordOrThrow(recordId);
    const assetPath = await this.storage.createAssetPath(recordId, 'IMAGE');

    await this.withActiveSession(() =>
      this.sessionManager.captureScreenshot(recordId, assetPath.filePath),
    );

    const [fileSizeBytes, sourceUrl] = await Promise.all([
      this.storage.getFileSize(assetPath.filePath),
      this.getCurrentSessionUrl(recordId),
    ]);
    const asset = await this.prisma.captureAsset.create({
      data: {
        recordId,
        type: 'IMAGE',
        fileName: assetPath.fileName,
        fileSizeBytes,
        sourceUrl,
      },
    });

    return this.mapCaptureAsset(asset);
  }

  async startVideo(recordId: string): Promise<CaptureVideoStateResponse> {
    await this.findStartedRecordOrThrow(recordId);
    const assetPath = await this.storage.createAssetPath(recordId, 'VIDEO');

    await this.withActiveSession(() =>
      this.sessionManager.startVideo(recordId, assetPath.filePath),
    );
    this.pendingVideoAssets.set(recordId, assetPath);

    return {
      recording: true,
    };
  }

  async stopVideo(recordId: string): Promise<CaptureVideoStateResponse> {
    await this.findStartedRecordOrThrow(recordId);
    const assetPath = this.pendingVideoAssets.get(recordId);

    if (!assetPath) {
      throw new ConflictException('Capture video recording is not active');
    }

    await this.withActiveSession(() => this.sessionManager.stopVideo(recordId));
    const asset = await this.persistVideoAsset(recordId, assetPath);
    this.pendingVideoAssets.delete(recordId);

    return {
      recording: false,
      asset,
    };
  }

  async completeRecord(recordId: string): Promise<CompleteCaptureResponse> {
    await this.findStartedRecordOrThrow(recordId);
    const pendingVideoAsset = this.pendingVideoAssets.get(recordId);

    if (pendingVideoAsset) {
      await this.persistPendingVideoBestEffort(recordId, pendingVideoAsset);
    }

    await this.closeSessionBestEffort(recordId);

    const finishedAt = new Date();
    const completedRecord = (await this.prisma.contentRecord.update({
      where: {
        id: recordId,
      },
      data: {
        status: 'COMPLETED',
        finishedAt,
      },
    })) as StoredContentRecord;
    const { imageCount, videoCount } = await this.getAssetCounts(recordId);
    const response = {
      ...this.mapContentRecord(completedRecord),
      status: 'COMPLETED',
      imageCount,
      videoCount,
    } satisfies CompleteCaptureResponse;

    this.eventsPublisher.publishCaptureCompleted({
      recordId: response.id,
      userId: response.userId,
      title: response.title,
      siteUrl: response.siteUrl,
      imageCount,
      videoCount,
      occurredAt: response.finishedAt ?? finishedAt.toISOString(),
    });

    return response;
  }

  private async persistVideoAsset(
    recordId: string,
    assetPath: PendingVideoAsset,
  ): Promise<CaptureAssetResponse> {
    const [fileSizeBytes, sourceUrl] = await Promise.all([
      this.storage.getFileSize(assetPath.filePath),
      this.getCurrentSessionUrl(recordId),
    ]);
    const asset = await this.prisma.captureAsset.create({
      data: {
        recordId,
        type: 'VIDEO',
        fileName: assetPath.fileName,
        fileSizeBytes,
        sourceUrl,
      },
    });

    return this.mapCaptureAsset(asset);
  }

  private async getAssetCounts(
    recordId: string,
  ): Promise<Pick<CaptureRecordDetailsResponse, 'imageCount' | 'videoCount'>> {
    const [imageCount, videoCount] = await Promise.all([
      this.prisma.captureAsset.count({
        where: {
          recordId,
          type: 'IMAGE',
        },
      }) as Promise<number>,
      this.prisma.captureAsset.count({
        where: {
          recordId,
          type: 'VIDEO',
        },
      }) as Promise<number>,
    ]);

    return {
      imageCount,
      videoCount,
    };
  }

  private async findRecordOrThrow(
    recordId: string,
  ): Promise<StoredContentRecord> {
    const record = (await this.prisma.contentRecord.findUnique({
      where: {
        id: recordId,
      },
    })) as StoredContentRecord | null;

    if (!record) {
      throw new NotFoundException('Registro de captura nao encontrado');
    }

    return record;
  }

  private async findStartedRecordOrThrow(
    recordId: string,
  ): Promise<StoredContentRecord> {
    const record = await this.findRecordOrThrow(recordId);

    if (record.status !== 'STARTED') {
      throw new ConflictException('Registro de captura nao esta em andamento');
    }

    return record;
  }

  private async withActiveSession<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ConflictException('Sessao de captura nao esta ativa');
      }

      throw error;
    }
  }

  private async closeSessionBestEffort(recordId: string): Promise<void> {
    try {
      await this.sessionManager.closeSession(recordId);
    } catch (error) {
      if (this.isInactiveSessionError(error)) {
        return;
      }

      throw error;
    }
  }

  private async persistPendingVideoBestEffort(
    recordId: string,
    pendingVideoAsset: PendingVideoAsset,
  ): Promise<void> {
    try {
      await this.withActiveSession(() =>
        this.sessionManager.stopVideo(recordId),
      );
      await this.persistVideoAsset(recordId, pendingVideoAsset);
    } catch (error) {
      if (!this.isInactiveSessionError(error)) {
        throw error;
      }
    } finally {
      this.pendingVideoAssets.delete(recordId);
    }
  }

  private isInactiveSessionError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error);

    return (
      error instanceof NotFoundException ||
      (error instanceof ConflictException &&
        error.message === 'Sessao de captura nao esta ativa') ||
      message.includes('target page') ||
      message.includes('page is closed') ||
      message.includes('context closed') ||
      message.includes('browser has been closed')
    );
  }

  private async getCurrentSessionUrl(recordId: string): Promise<string> {
    const frame = await this.withActiveSession(() =>
      this.sessionManager.getFrame(recordId),
    );

    return frame.currentUrl;
  }

  private mapContentRecord(record: StoredContentRecord): ContentRecordResponse {
    return {
      id: record.id,
      userId: record.userId,
      title: record.title,
      siteUrl: record.siteUrl,
      status: record.status,
      startedAt: record.startedAt.toISOString(),
      finishedAt: this.mapOptionalDate(record.finishedAt),
    };
  }

  private mapRecordListItem(
    record: StoredListedContentRecord,
  ): CaptureRecordListItemResponse {
    const imageCount = record.assets.filter(
      (asset) => asset.type === 'IMAGE',
    ).length;
    const videoCount = record.assets.filter(
      (asset) => asset.type === 'VIDEO',
    ).length;

    return {
      ...this.mapContentRecord(record),
      details: record.details ?? undefined,
      imageCount,
      videoCount,
    };
  }

  private mapCaptureAsset(asset: StoredCaptureAsset): CaptureAssetResponse {
    return {
      id: asset.id,
      recordId: asset.recordId,
      type: asset.type,
      fileName: asset.fileName,
      fileSizeBytes: asset.fileSizeBytes ?? undefined,
      sourceUrl: asset.sourceUrl ?? undefined,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  private mapOptionalDate(date: Date | null | undefined): string | undefined {
    return date?.toISOString();
  }

  private getAssetContentType(type: CaptureAssetType): string {
    return type === 'IMAGE' ? 'image/png' : 'video/webm';
  }

  private getCaptureTitle(siteUrl: string, title?: string): string {
    const trimmedTitle = title?.trim();

    if (trimmedTitle) {
      return trimmedTitle;
    }

    const hostname = new URL(siteUrl).hostname;
    const timestamp = this.formatTitleDate(new Date());

    return `Captura - ${hostname} - ${timestamp}`;
  }

  private formatTitleDate(date: Date): string {
    const year = date.getUTCFullYear().toString().padStart(4, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hour = date.getUTCHours().toString().padStart(2, '0');
    const minute = date.getUTCMinutes().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
}
