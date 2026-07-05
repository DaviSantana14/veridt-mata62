import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type {
  CreateCardPaymentResponse,
  CreateCreditPurchaseResponse,
  CreateEmbeddedCreditPurchaseResponse,
  CreditPackageResponse,
  HealthResponse,
  SimulatePaymentResponse,
} from '@veridit/contracts';
import { AppService } from './app.service';
import type {
  MercadoPagoWebhookPayload,
  MercadoPagoWebhookResponse,
  MockPurchaseResponse,
} from './app.service';
import { CreateCardPaymentDto } from './dto/create-card-payment.dto';
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

  @Post('purchases/card')
  createCardPurchase(
    @Body() body: CreateCreditPurchaseDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<CreateEmbeddedCreditPurchaseResponse> {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return this.appService.createCardPurchase(body, idempotencyKey);
  }

  @Post('purchases/:purchaseId/mercado-pago/card-payment')
  createMercadoPagoCardPayment(
    @Param('purchaseId') purchaseId: string,
    @Body() body: CreateCardPaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<CreateCardPaymentResponse> {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return this.appService.createMercadoPagoCardPayment(
      purchaseId,
      body,
      idempotencyKey,
    );
  }

  @Post('purchases/:purchaseId/simulate-payment')
  simulatePayment(
    @Param('purchaseId') purchaseId: string,
  ): Promise<SimulatePaymentResponse> {
    return this.appService.simulatePayment(purchaseId);
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
