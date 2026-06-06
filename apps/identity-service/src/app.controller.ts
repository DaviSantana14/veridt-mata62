import { Body, Controller, Get, Post, ValidationPipe } from '@nestjs/common';

import type {
  AuthResponse,
  HealthResponse,
  UserResponse,
} from '@veridit/contracts';

import { AppService } from './app.service';

import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user-dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }

  @Post('users')
  async createUser(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: CreateUserDto,
  ): Promise<UserResponse> {
    return this.appService.createUser(body);
  }

  @Post('auth/login')
  async login(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: LoginUserDto,
  ): Promise<AuthResponse> {
    return this.appService.login(body);
  }
}
