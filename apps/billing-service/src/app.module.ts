import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BillingEventsPublisher } from './messaging/billing-events.publisher';
import { MercadoPagoPaymentProvider } from './payments/mercado-pago-payment.provider';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [AppService, BillingEventsPublisher, MercadoPagoPaymentProvider],
})
export class AppModule {}
