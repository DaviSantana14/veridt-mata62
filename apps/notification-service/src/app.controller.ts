import { Controller, Get } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  VERIDIT_EVENTS,
  type CreditPurchaseCreatedEvent,
  type HealthResponse,
  type PasswordResetRequestedEvent,
  type UserRegisteredEvent,
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

  @EventPattern(VERIDIT_EVENTS.userRegistered)
  handleUserRegistered(
    @Payload() event: UserRegisteredEvent,
  ): Promise<NotificationResponse> {
    return this.appService.createUserRegisteredEmail(event);
  }

  @EventPattern(VERIDIT_EVENTS.passwordResetRequested)
  handlePasswordResetRequested(
    @Payload() event: PasswordResetRequestedEvent,
  ): Promise<NotificationResponse> {
    return this.appService.createPasswordResetEmail(event);
  }
}
