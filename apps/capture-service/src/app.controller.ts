import { Body, Controller, Get, Post } from '@nestjs/common';
import type { ContentRecordResponse, HealthResponse } from '@veridit/contracts';
import { AppService } from './app.service';
import { MockCaptureDto } from './dto/mock-capture.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }

  @Post('records/mock')
  createMockRecord(
    @Body() body: MockCaptureDto,
  ): Promise<ContentRecordResponse> {
    return this.appService.createMockRecord(body);
  }
}
