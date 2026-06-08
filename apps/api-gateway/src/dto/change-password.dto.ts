import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { ChangePasswordRequest } from '@veridit/contracts';

export class ChangePasswordDto implements ChangePasswordRequest {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  newPassword!: string;
}
