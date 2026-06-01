import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
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

  @IsString()
  @IsNotEmpty({
    message: 'CPF é obrigatório',
  })
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter 11 números',
  })
  cpf!: string;

  @IsString()
  @MinLength(6, {
    message: 'Senha deve ter no mínimo 6 caracteres',
  })
  @IsNotEmpty({
    message: 'Senha é obrigatória',
  })
  password!: string;

  @IsIn(['COMMON_USER', 'LAWYER'], {
    message: 'Perfil inválido',
  })
  profile!: 'COMMON_USER' | 'LAWYER';

  @ValidateIf((o) => o.profile === 'LAWYER')
  @IsString()
  @IsNotEmpty({
    message: 'Número da OAB é obrigatório para advogados',
  })
  oabNumber?: string;
}

