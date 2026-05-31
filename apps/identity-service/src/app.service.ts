import { Injectable, UnauthorizedException } from '@nestjs/common';
import type {
  HealthResponse,
  RegisterUserRequest,
  UserResponse,
} from '@veridit/contracts';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService 
  ) {}

  getHealth(): HealthResponse {
    return {
      service: 'identity-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  // Esta é a função do seu colega (Cadastro)
  async createUser(body: RegisterUserRequest): Promise<UserResponse> {
    const user = await this.prisma.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        cpf: body.cpf,
        profile: body.profile,
        oabNumber: body.oabNumber,
        // Necessário adicionar passwordHash para que o login funcione
      },
    });

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      cpf: user.cpf,
      profile: user.profile,
      createdAt: user.createdAt.toISOString(),
    };
  }

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

    const payload = { 
      sub: utilizador.id, 
      email: utilizador.email, 
      profile: utilizador.profile 
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      mensagem: 'Login aprovado!',
      accessToken: token,
    };
  }
}