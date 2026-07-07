import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
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
  ListCaptureAssetsResponse,
  ListCaptureRecordsResponse,
  NavigateCaptureRequest,
  NavigateCaptureResponse,
  StartCaptureSessionResponse,
} from '@veridit/contracts';
import { AppService } from './app.service';
import { BrowserInputDto } from './dto/browser-input.dto';
import { MockCaptureDto } from './dto/mock-capture.dto';
import { NavigateCaptureDto } from './dto/navigate-capture.dto';
import { StartCaptureDto } from './dto/start-capture.dto';

interface HeaderResponse {
  set(headers: Record<string, string>): void;
  set(header: string, value: string): void;
}

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

  @Get('records/:recordId/assets')
  listAssets(
    @Param('recordId') recordId: string,
  ): Promise<ListCaptureAssetsResponse> {
    return this.appService.listAssets(recordId);
  }

  @Get('records/:recordId/assets/:assetId/download')
  async downloadAsset(
    @Param('recordId') recordId: string,
    @Param('assetId') assetId: string,
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<StreamableFile> {
    const asset = await this.appService.getAssetDownload(recordId, assetId);

    response.set({
      'Content-Type': asset.contentType,
      'Content-Disposition': this.getAttachmentHeader(asset.fileName),
    });

    if (asset.contentLength !== undefined) {
      response.set('Content-Length', String(asset.contentLength));
    }

    return new StreamableFile(asset.stream);
  }

  private getAttachmentHeader(fileName: string): string {
    const safeName = fileName.replace(/["\r\n]/g, '_');
    const encodedName = encodeURIComponent(fileName);

    return `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
  }

  @Get('users/:userId/records')
  listRecordsForUser(
    @Param('userId') userId: string,
  ): Promise<ListCaptureRecordsResponse> {
    return this.appService.listRecordsForUser(userId);
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
