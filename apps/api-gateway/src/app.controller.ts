import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import type {
  AuthResponse,
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
import { LoginUserDto } from './dto/login-user.dto';

// Importe os DTOs que você copiou
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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

  @Get('identity/users/:id')
  getUser(@Param('id') id: string): Promise<UserResponse> {
    return this.appService.getUser(id);
  }

  @Patch('identity/users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserProfileDto,
  ): Promise<UserResponse> {
    return this.appService.updateUser(id, body);
  }

  @Patch('identity/users/:id/password')
  changePassword(
    @Param('id') id: string,
    @Body() body: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.appService.changePassword(id, body);
  }

  @Post('identity/auth/login')
  loginUser(@Body() body: LoginUserDto): Promise<AuthResponse> {
    return this.appService.loginUser(body);
  }

  // --- NOVAS ROTAS EXPOSTAS NO GATEWAY ---
  @Post('identity/auth/forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.appService.forgotPassword(body);
  }

  @Post('identity/auth/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.appService.resetPassword(body);
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
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<CreateCreditPurchaseResponse> {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return this.appService.createCreditPurchase(body, idempotencyKey);
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
