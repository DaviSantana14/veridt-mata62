import { IsEmail, IsIn, IsString } from 'class-validator';
import type { CreateCreditPurchaseRequest } from '@veridit/contracts';

export class CreateCreditPurchaseDto implements CreateCreditPurchaseRequest {
  @IsString()
  userId!: string;

  @IsIn(['basic', 'medium', 'premium'])
  packageName!: 'basic' | 'medium' | 'premium';

  @IsEmail()
  payerEmail!: string;
}
