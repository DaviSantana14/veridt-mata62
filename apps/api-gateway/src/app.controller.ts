import { Body, Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { LoginDto } from './dto/login.dto'; // Adicione esta linha
import type {
  ContentRecordResponse,
  CreditPackageResponse,
  HealthResponse,
  PurchaseCreditsRequest,
  UserResponse,
} from '@veridit/contracts';
import { AppService } from './app.service';
import type { GatewayHealthResponse } from './app.service';
import { MockCaptureDto } from './dto/mock-capture.dto';
import { MockPurchaseDto } from './dto/mock-purchase.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('identity/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto) {
    return this.appService.login(body);
  }

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
