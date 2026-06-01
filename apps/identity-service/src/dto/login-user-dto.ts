import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginUserDto {
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

  @IsString()
  @MinLength(6, {
    message: 'Senha deve ter no mínimo 6 caracteres',
  })
  @IsNotEmpty({
    message: 'Senha é obrigatória',
  })
  password!: string;
}


