import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import type { UpdateUserProfileRequest } from '@veridit/contracts';

export class UpdateUserProfileDto implements UpdateUserProfileRequest {
  @IsString()
  @IsNotEmpty({
    message: 'Nome completo é obrigatório',
  })
  fullName!: string;

  @IsEmail(
    {},
    {
      message: 'Email inválido',
    },
  )
  @IsNotEmpty({
    message: 'Email é obrigatório',
  })
  email!: string;
}
