import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type {
  BrowserInputRequest,
  BrowserInputResponse,
  CaptureAssetResponse,
  CaptureFrameResponse,
  CaptureRecordDetailsResponse,
  CaptureVideoStateResponse,
  CompleteCaptureResponse,
  ContentRecordResponse,
  HealthResponse,
  NavigateCaptureRequest,
  NavigateCaptureResponse,
  StartCaptureSessionResponse,
} from '@veridit/contracts';
import { AppService } from './app.service';
import { BrowserInputDto } from './dto/browser-input.dto';
import { MockCaptureDto } from './dto/mock-capture.dto';
import { NavigateCaptureDto } from './dto/navigate-capture.dto';
import { StartCaptureDto } from './dto/start-capture.dto';

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

  @Post('records')
  startRecord(
    @Body() body: StartCaptureDto,
  ): Promise<StartCaptureSessionResponse> {
    return this.appService.startRecord(body);
  }

  @Get('records/:recordId')
  getRecord(
    @Param('recordId') recordId: string,
  ): Promise<CaptureRecordDetailsResponse> {
    return this.appService.getRecord(recordId);
  }

  @Get('records/:recordId/frame')
  getFrame(@Param('recordId') recordId: string): Promise<CaptureFrameResponse> {
    return this.appService.getFrame(recordId);
  }

  @Post('records/:recordId/input')
  sendInput(
    @Param('recordId') recordId: string,
    @Body() input: BrowserInputDto,
  ): Promise<BrowserInputResponse> {
    return this.appService.sendInput(recordId, input as BrowserInputRequest);
  }

  @Post('records/:recordId/navigate')
  navigate(
    @Param('recordId') recordId: string,
    @Body() input: NavigateCaptureDto,
  ): Promise<NavigateCaptureResponse> {
    return this.appService.navigate(recordId, input as NavigateCaptureRequest);
  }

  @Post('records/:recordId/screenshots')
  captureScreenshot(
    @Param('recordId') recordId: string,
  ): Promise<CaptureAssetResponse> {
    return this.appService.captureScreenshot(recordId);
  }

  @Post('records/:recordId/video/start')
  startVideo(
    @Param('recordId') recordId: string,
  ): Promise<CaptureVideoStateResponse> {
    return this.appService.startVideo(recordId);
  }

  @Post('records/:recordId/video/stop')
  stopVideo(
    @Param('recordId') recordId: string,
  ): Promise<CaptureVideoStateResponse> {
    return this.appService.stopVideo(recordId);
  }

  @Post('records/:recordId/complete')
  completeRecord(
    @Param('recordId') recordId: string,
  ): Promise<CompleteCaptureResponse> {
    return this.appService.completeRecord(recordId);
  }
}
