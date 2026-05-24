import { Body, Controller, Get, Post } from '@nestjs/common';
import type { HealthResponse, UserResponse } from '@veridit/contracts';
import { AppService } from './app.service';
import { CreateUserDto } from './dto/create-user.dto';

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
}
