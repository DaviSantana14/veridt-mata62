import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import type {
  AuthResponse,
  HealthResponse,
  UserResponse,
} from '@veridit/contracts';
import { PrismaService } from './prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user-dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserEventsPublisher } from './messaging/user-events.publisher';

type UserEntity = {
  id: string;
  fullName: string;
  email: string;
  cpf: string;
  profile: 'COMMON_USER' | 'LAWYER';
  createdAt: Date;
};

function toUserResponse(user: UserEntity): UserResponse {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    cpf: user.cpf,
    profile: user.profile,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly userEventsPublisher: UserEventsPublisher,
  ) {}

  getHealth(): HealthResponse {
    return {
      service: 'identity-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async createUser(body: CreateUserDto): Promise<UserResponse> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { cpf: body.cpf }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Usuário já cadastrado');
    }

    if (body.profile === 'LAWYER' && !body.oabNumber) {
      throw new BadRequestException('Advogado precisa informar OAB');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

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

    this.userEventsPublisher.publishUserRegistered({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      profile: user.profile,
      occurredAt: user.createdAt.toISOString(),
    });

    return toUserResponse(user);
  }

  async getUser(id: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return toUserResponse(user);
  }

  async updateUser(
    id: string,
    body: UpdateUserProfileDto,
  ): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const email = body.email.toLowerCase().trim();
    const fullName = body.fullName.trim();

    const existingUserWithEmail = await this.prisma.user.findFirst({
      where: {
        email,
        NOT: { id },
      },
    });

    if (existingUserWithEmail) {
      throw new BadRequestException('E-mail já cadastrado');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        fullName,
        email,
      },
    });

    return toUserResponse(updatedUser);
  }

  async changePassword(
    id: string,
    body: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const passwordMatch = await bcrypt.compare(
      body.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Senha atual inválida');
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return {
      message: 'Senha alterada com sucesso.',
    };
  }

  async login(body: LoginUserDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: body.email.toLowerCase().trim(),
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const passwordMatch = await bcrypt.compare(
      body.password,
      user.passwordHash,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      profile: user.profile,
    };

    const accessToken = await this.jwtService.signAsync(payload);

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

  async forgotPassword(body: ForgotPasswordDto) {
    const email = body.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message: 'Se o e-mail estiver cadastrado, um código será enviado.',
      };
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const tokenHash = await bcrypt.hash(otpCode, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Validade de 15 minutos

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    this.userEventsPublisher.publishPasswordResetRequested({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      code: otpCode,
      expiresAt: expiresAt.toISOString(),
      occurredAt: new Date().toISOString(),
    });

    return {
      message: 'Se o e-mail estiver cadastrado, um código será enviado.',
    };
  }

  async resetPassword(body: ResetPasswordDto) {
    const email = body.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    const activeTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeTokens.length === 0) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    let validToken = null;
    for (const token of activeTokens) {
      const isValid = await bcrypt.compare(body.code, token.tokenHash);
      if (isValid) {
        validToken = token;
        break;
      }
    }

    if (!validToken) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    const newPasswordHash = await bcrypt.hash(body.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: validToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      message: 'Senha alterada com sucesso.',
    };
  }
}
