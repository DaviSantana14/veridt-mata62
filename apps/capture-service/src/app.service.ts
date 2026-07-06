import { Injectable } from '@nestjs/common';
import {
  type ContentRecordResponse,
  type HealthResponse,
  type StartCaptureRequest,
} from '@veridit/contracts';
import { CaptureEventsPublisher } from './messaging/capture-events.publisher';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsPublisher: CaptureEventsPublisher,
  ) {}

  getHealth(): HealthResponse {
    return {
      service: 'capture-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async startCapture(
      body: StartCaptureRequest,
    ): Promise<ContentRecordResponse> {
      const record = await this.prisma.contentRecord.create({
        data: {
          userId: body.userId,
          title: body.title,
          siteUrl: body.siteUrl,
        },
      });

      return {
        id: record.id,
        userId: record.userId,
        title: record.title,
        siteUrl: record.siteUrl,
        status: "STARTED", 
        startedAt: record.startedAt.toISOString(),
        finishedAt: undefined, 
      };
    }

  async createMockRecord(
    body: StartCaptureRequest,
  ): Promise<ContentRecordResponse> {
    const finishedAt = new Date();
    const record = await this.prisma.contentRecord.create({
      data: {
        userId: body.userId,
        title: body.title,
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
}
