import {
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { CreateCardPaymentRequest } from '@veridit/contracts';

class CardPaymentPayerIdentificationDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  number?: string;
}

class CardPaymentPayerDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardPaymentPayerIdentificationDto)
  identification?: CardPaymentPayerIdentificationDto;
}

export class CreateCardPaymentDto implements CreateCardPaymentRequest {
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number;

  @IsString()
  paymentMethodId!: string;

  @IsOptional()
  @IsString()
  issuerId?: string;

  @IsOptional()
  @IsString()
  selectedPaymentMethod?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CardPaymentPayerDto)
  payer!: CardPaymentPayerDto;
}
