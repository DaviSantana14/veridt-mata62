import { Injectable } from '@nestjs/common';
import {
  type CaptureCompletedEvent,
  type HealthResponse,
} from '@veridit/contracts';
import { PrismaService } from './prisma/prisma.service';

export interface ReportResponse {
  id: string;
  recordId: string;
  status: string;
  fileName: string;
  createdAt: string;
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth(): HealthResponse {
    return {
      service: 'report-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async createMockReport(
    event: CaptureCompletedEvent,
  ): Promise<ReportResponse> {
    const report = await this.prisma.recordReport.create({
      data: {
        recordId: event.recordId,
        userId: event.userId,
        title: event.title,
        status: 'READY',
        fileName: `report-${event.recordId}.pdf`,
        fileSizeBytes: 64000,
        generatedAt: new Date(),
      },
    });

    return {
      id: report.id,
      recordId: report.recordId,
      status: report.status,
      fileName: report.fileName ?? `report-${event.recordId}.pdf`,
      createdAt: report.createdAt.toISOString(),
    };
  }
}
