import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
} from '@nestjs/common';
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
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<CreateCreditPurchaseResponse> {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return this.appService.createCreditPurchase(body, idempotencyKey);
  }

  @Post('payments/mercado-pago/webhook')
  handleMercadoPagoWebhook(
    @Body() body: MercadoPagoWebhookPayload,
    @Query() query: MercadoPagoWebhookPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<MercadoPagoWebhookResponse> {
    return this.appService.handleMercadoPagoWebhook(
      {
        ...query,
        ...body,
        data: body.data ?? query.data,
      },
      {
        xSignature: getHeader(headers, 'x-signature'),
        xRequestId: getHeader(headers, 'x-request-id'),
      },
    );
  }
}

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name];

  return typeof value === 'string' ? value : undefined;
}
