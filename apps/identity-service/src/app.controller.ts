import { Body, Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import type { HealthResponse, UserResponse } from '@veridit/contracts';
import { AppService } from './app.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }

  @Post('users')
  createUser(@Body() body: CreateUserDto): Promise<UserResponse> {
    return this.appService.createUser(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK) 
  async login(@Body() body: LoginDto) {
    return await this.appService.login(body);
  }
}