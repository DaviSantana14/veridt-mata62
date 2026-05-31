import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class IdentityService {
  constructor(private prisma: PrismaService) {}

  async login(dadosDeLogin: LoginDto) {
    const utilizador = await this.prisma.user.findUnique({
      where: { email: dadosDeLogin.email },
    });

    if (!utilizador || !utilizador.passwordHash) {
      throw new UnauthorizedException('E-mail ou senha inválidos'); 
    }

    const senhaEstaCorreta = await bcrypt.compare(dadosDeLogin.password, utilizador.passwordHash);

    if (!senhaEstaCorreta) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    return {
      mensagem: 'Login aprovado!',
    };
  }
}