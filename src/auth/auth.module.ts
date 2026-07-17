import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './guards/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '15m',
      },
    }),
    MailModule,
  ],

  controllers: [AuthController],

  providers: [AuthService, PrismaService, JwtStrategy],

  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
