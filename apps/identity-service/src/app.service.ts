import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import type {
  AuthResponse,
  HealthResponse,
  UserResponse,
} from '@veridit/contracts';

import { PrismaService } from './prisma/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user-dto';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  getHealth(): HealthResponse {
    return {
      service: 'identity-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async createUser(
    body: CreateUserDto,
  ): Promise<UserResponse> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { cpf: body.cpf }],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Usuário já cadastrado',
      );
    }

    if (
      body.profile === 'LAWYER' &&
      !body.oabNumber
    ) {
      throw new BadRequestException(
        'Advogado precisa informar OAB',
      );
    }

    const passwordHash = await bcrypt.hash(
      body.password,
      10,
    );

    const user = await this.prisma.user.create({
      data: {
        fullName: body.fullName.trim(),
        email: body.email.toLowerCase().trim(),
        cpf: body.cpf.trim(),
        passwordHash,
        profile: body.profile,
        oabNumber: body.oabNumber?.trim(),
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

  async login(
    body: LoginUserDto,
  ): Promise<AuthResponse & { accessToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: body.email.toLowerCase().trim(),
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(
        'Email ou senha inválidos',
      );
    }

    const passwordMatch = await bcrypt.compare(
      body.password,
      user.passwordHash,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException(
        'Email ou senha inválidos',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      profile: user.profile,
    };

    const accessToken =
      await this.jwtService.signAsync(payload);

    return {
      message: 'Login realizado com sucesso',
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        profile: user.profile,
      },
    };
  }
}

