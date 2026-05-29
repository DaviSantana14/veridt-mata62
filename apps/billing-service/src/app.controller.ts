import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type {
  CreateCreditPurchaseResponse,
  CreditPackageResponse,
  HealthResponse,
} from '@veridit/contracts';
import { AppService } from './app.service';
import type {
  MercadoPagoWebhookPayload,
  MercadoPagoWebhookResponse,
  MockPurchaseResponse,
} from './app.service';
import { CreateCreditPurchaseDto } from './dto/create-credit-purchase.dto';
import { MockPurchaseDto } from './dto/mock-purchase.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }

  @Get('packages')
  getPackages(): CreditPackageResponse[] {
    return this.appService.getPackages();
  }

  @Post('purchases/mock')
  createMockPurchase(
    @Body() body: MockPurchaseDto,
  ): Promise<MockPurchaseResponse> {
    return this.appService.createMockPurchase(body);
  }

  @Post('purchases')
  createCreditPurchase(
    @Body() body: CreateCreditPurchaseDto,
  ): Promise<CreateCreditPurchaseResponse> {
    return this.appService.createCreditPurchase(body);
  }

  @Post('payments/mercado-pago/webhook')
  handleMercadoPagoWebhook(
    @Body() body: MercadoPagoWebhookPayload,
    @Query() query: MercadoPagoWebhookPayload,
  ): Promise<MercadoPagoWebhookResponse> {
    return this.appService.handleMercadoPagoWebhook({
      ...query,
      ...body,
      data: body.data ?? query.data,
    });
  }
}
