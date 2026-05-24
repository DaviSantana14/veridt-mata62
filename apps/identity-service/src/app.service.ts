import { Injectable } from '@nestjs/common';
import type {
  HealthResponse,
  RegisterUserRequest,
  UserResponse,
} from '@veridit/contracts';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth(): HealthResponse {
    return {
      service: 'identity-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async createUser(body: RegisterUserRequest): Promise<UserResponse> {
    const user = await this.prisma.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        cpf: body.cpf,
        profile: body.profile,
        oabNumber: body.oabNumber,
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
}
