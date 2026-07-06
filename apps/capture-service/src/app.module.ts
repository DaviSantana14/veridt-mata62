import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CaptureSessionManagerService } from './capture/capture-session-manager.service';
import { CaptureStorageService } from './capture/capture-storage.service';
import { PlaywrightBrowserService } from './capture/playwright-browser.service';
import { UrlPolicyService } from './capture/url-policy.service';
import { CaptureEventsPublisher } from './messaging/capture-events.publisher';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [
    AppService,
    CaptureEventsPublisher,
    UrlPolicyService,
    CaptureStorageService,
    PlaywrightBrowserService,
    CaptureSessionManagerService,
  ],
})
export class AppModule {}
