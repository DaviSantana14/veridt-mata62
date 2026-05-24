import { Controller, Get } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  VERIDIT_EVENTS,
  type CaptureCompletedEvent,
  type HealthResponse,
} from '@veridit/contracts';
import { AppService } from './app.service';
import type { ReportResponse } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }

  @EventPattern(VERIDIT_EVENTS.captureCompleted)
  handleCaptureCompleted(
    @Payload() event: CaptureCompletedEvent,
  ): Promise<ReportResponse> {
    return this.appService.createMockReport(event);
  }
}
