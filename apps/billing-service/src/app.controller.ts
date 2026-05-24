import { Body, Controller, Get, Post } from '@nestjs/common';
import type { CreditPackageResponse, HealthResponse } from '@veridit/contracts';
import { AppService } from './app.service';
import type { MockPurchaseResponse } from './app.service';
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
}
