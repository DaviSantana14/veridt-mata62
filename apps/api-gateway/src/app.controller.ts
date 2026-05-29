import { Body, Controller, Get, Post } from '@nestjs/common';
import type {
  ContentRecordResponse,
  CreateCreditPurchaseResponse,
  CreditPackageResponse,
  HealthResponse,
  PurchaseCreditsRequest,
  UserResponse,
} from '@veridit/contracts';
import { AppService } from './app.service';
import type { GatewayHealthResponse } from './app.service';
import { CreateCreditPurchaseDto } from './dto/create-credit-purchase.dto';
import { MockCaptureDto } from './dto/mock-capture.dto';
import { MockPurchaseDto } from './dto/mock-purchase.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): GatewayHealthResponse {
    return this.appService.getHealth();
  }

  @Get('identity/health')
  getIdentityHealth(): Promise<HealthResponse> {
    return this.appService.getIdentityHealth();
  }

  @Post('identity/users')
  createUser(@Body() body: CreateUserDto): Promise<UserResponse> {
    return this.appService.createUser(body);
  }

  @Get('billing/health')
  getBillingHealth(): Promise<HealthResponse> {
    return this.appService.getBillingHealth();
  }

  @Get('billing/packages')
  getCreditPackages(): Promise<CreditPackageResponse[]> {
    return this.appService.getCreditPackages();
  }

  @Post('billing/purchases/mock')
  createMockPurchase(
    @Body() body: MockPurchaseDto,
  ): Promise<PurchaseCreditsRequest & { purchaseId: string; status: string }> {
    return this.appService.createMockPurchase(body);
  }

  @Post('billing/purchases')
  createCreditPurchase(
    @Body() body: CreateCreditPurchaseDto,
  ): Promise<CreateCreditPurchaseResponse> {
    return this.appService.createCreditPurchase(body);
  }

  @Get('capture/health')
  getCaptureHealth(): Promise<HealthResponse> {
    return this.appService.getCaptureHealth();
  }

  @Post('capture/records/mock')
  createMockCapture(
    @Body() body: MockCaptureDto,
  ): Promise<ContentRecordResponse> {
    return this.appService.createMockCapture(body);
  }
}
