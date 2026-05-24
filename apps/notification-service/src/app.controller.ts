import { Controller, Get } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  VERIDIT_EVENTS,
  type CreditPurchaseCreatedEvent,
  type HealthResponse,
} from '@veridit/contracts';
import { AppService } from './app.service';
import type { NotificationResponse } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }

  @EventPattern(VERIDIT_EVENTS.creditPurchased)
  handleCreditPurchased(
    @Payload() event: CreditPurchaseCreatedEvent,
  ): Promise<NotificationResponse> {
    return this.appService.createCreditPurchaseEmail(event);
  }
}
