import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

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
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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

  @Get('users/:id')
  async getUser(@Param('id') id: string): Promise<UserResponse> {
    return this.appService.getUser(id);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserProfileDto,
  ): Promise<UserResponse> {
    return this.appService.updateUser(id, body);
  }

  @Patch('users/:id/password')
  async changePassword(
    @Param('id') id: string,
    @Body() body: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.appService.changePassword(id, body);
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
