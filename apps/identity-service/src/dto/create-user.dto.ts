import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';
import type { RegisterUserRequest } from '@veridit/contracts';

export class CreateUserDto implements RegisterUserRequest {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(11, 14)
  cpf!: string;

  @IsIn(['COMMON_USER', 'LAWYER'])
  profile!: 'COMMON_USER' | 'LAWYER';

  @IsOptional()
  @IsString()
  oabNumber?: string;
}
