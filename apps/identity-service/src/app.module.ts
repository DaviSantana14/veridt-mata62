import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // <-- Importação nova
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: 'chave-super-secreta-do-veridt',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}