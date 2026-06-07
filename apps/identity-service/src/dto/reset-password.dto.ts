import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'O e-mail fornecido não é válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string;

  @IsString({ message: 'O código deve ser um texto.' })
  @IsNotEmpty({ message: 'O código de verificação é obrigatório.' })
  @Length(6, 6, { message: 'O código de verificação deve ter exatamente 6 caracteres.' })
  code!: string;

  @IsString({ message: 'A nova senha deve ser um texto.' })
  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres.' })
  newPassword!: string;
}