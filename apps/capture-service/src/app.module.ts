import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CaptureEventsPublisher } from './messaging/capture-events.publisher';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [AppService, CaptureEventsPublisher],
})
export class AppModule {}
