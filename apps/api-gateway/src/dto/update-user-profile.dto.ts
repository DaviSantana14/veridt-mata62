import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import type { UpdateUserProfileRequest } from '@veridit/contracts';

export class UpdateUserProfileDto implements UpdateUserProfileRequest {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
