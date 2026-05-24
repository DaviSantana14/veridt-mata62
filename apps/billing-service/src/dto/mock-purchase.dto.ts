import { IsEmail, IsIn, IsString } from 'class-validator';
import type { PurchaseCreditsRequest } from '@veridit/contracts';

export class MockPurchaseDto implements PurchaseCreditsRequest {
  @IsString()
  userId!: string;

  @IsIn(['basic', 'medium', 'premium'])
  packageName!: 'basic' | 'medium' | 'premium';

  @IsEmail()
  payerEmail!: string;
}
