import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BillingEventsPublisher } from './messaging/billing-events.publisher';
import { MercadoPagoPaymentProvider } from './payments/mercado-pago-payment.provider';
import { PAYMENT_PROVIDER } from './payments/payment-provider.interface';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [
    AppService,
    BillingEventsPublisher,
    {
      provide: PAYMENT_PROVIDER,
      useClass: MercadoPagoPaymentProvider,
    },
  ],
})
export class AppModule {}
