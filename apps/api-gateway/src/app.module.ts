import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CapturePreviewProxyService } from './capture-preview-proxy.service';

@Module({
  controllers: [AppController],
  providers: [AppService, CapturePreviewProxyService],
})
export class AppModule {}
