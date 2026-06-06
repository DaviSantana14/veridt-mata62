import { IsEmail, IsString, MinLength } from 'class-validator';
import type { LoginUserRequest } from '@veridit/contracts';

export class LoginUserDto implements LoginUserRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
