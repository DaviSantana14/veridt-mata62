import { Body, Controller, Get, Post } from '@nestjs/common';

import type {
  AuthResponse,
  HealthResponse,
  UserResponse,
} from '@veridit/contracts';

import { AppService } from './app.service';

import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user-dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }

  @Post('users')
  async createUser(@Body() body: CreateUserDto): Promise<UserResponse> {
    return this.appService.createUser(body);
  }

  @Post('auth/login')
  async login(@Body() body: LoginUserDto): Promise<AuthResponse> {
    return this.appService.login(body);
  }

  @Post('auth/forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.appService.forgotPassword(body);
  }

  @Post('auth/reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.appService.resetPassword(body);
  }
}