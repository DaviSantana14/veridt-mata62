import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { ChangePasswordRequest } from '@veridit/contracts';

export class ChangePasswordDto implements ChangePasswordRequest {
  @IsString()
  @IsNotEmpty({
    message: 'Senha atual é obrigatória',
  })
  currentPassword!: string;

  @IsString()
  @MinLength(6, {
    message: 'Nova senha deve ter no mínimo 6 caracteres',
  })
  @IsNotEmpty({
    message: 'Nova senha é obrigatória',
  })
  newPassword!: string;
}
