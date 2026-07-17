import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from 'src/generated/prisma/client';
import { MailService } from './../mail/mail.service';
import { ForgotPasswordDto } from './dto/forgotpassword.dto';
import { ResetPasswordDto } from './dto/changepassword.dto';

// interface TokenResponse {
//   accessToken: string;
//   refreshToken: string;
// }

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(data: RegisterDto) {
    this.logger.log(`Register request: ${data.email}`);
    const existUser = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existUser) {
      this.logger.warn(`Register failed: Email ${data.email} already exists`);
      throw new ConflictException('Email already exists');
    }

    const hashPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashPassword,
        role: 'USER',
      },
    });
    this.logger.log(`User registered successfully. UserId=${user.id}`);

    return {
      message: 'Register success',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async login(data: LoginDto) {
    this.logger.log(`Login attempt: ${data.email}`);
    const user = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      this.logger.warn(`Login failed: ${data.email} not found`);
      throw new UnauthorizedException('Invalid credential');
    }

    const match = await bcrypt.compare(data.password, user.password);

    if (!match) {
      this.logger.warn(`Login failed: Wrong password for ${data.email}`);
      throw new UnauthorizedException('Invalid credential');
    }
    const tokens = await this.generateTokens(user);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshToken: tokens.refreshToken,
      },
    });
    this.logger.log(`Login successful. UserId=${user.id}`);
    return tokens;
  }

  async generateTokens(user: User) {
    this.logger.debug(`Generating JWT tokens for UserId=${user.id}`);
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '8h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string) {
    this.logger.log('Refresh token request');
    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user || user.refreshToken !== token) {
      this.logger.warn(`Refresh token failed. UserId=${payload.sub}`);
      throw new UnauthorizedException();
    }

    const tokens = await this.generateTokens(user);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshToken: tokens.refreshToken,
      },
    });
    this.logger.log(`Refresh token success. UserId=${user.id}`);

    return tokens;
  }

  async logout(userId: number) {
    this.logger.log(`Logout request. UserId=${userId}`);
    await this.prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        refreshToken: null,
      },
    });
    this.logger.log(`Logout successful. UserId=${userId}`);
    return {
      message: 'Logout success',
    };
  }
  async forgotPassword(dto: ForgotPasswordDto) {
    this.logger.log(`Forgot password request: ${dto.email}`);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      this.logger.warn(
        `Forgot password requested for non-existing email: ${dto.email}`,
      );

      return {
        message: 'If the email exists, a reset link has been sent.',
      };
    }
    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      },
    );
    this.logger.debug(`Reset password token generated. UserId=${user.id}`);

    await this.mailService.sendResetPasswordEmail(user.email, token);
    this.logger.log(`Reset password email sent. UserId=${user.id}`);

    return {
      message: 'Please check your email, a reset link has been sent.',
    };
  }
  async resetPassword(dto: ResetPasswordDto) {
    let payload;

    try {
      payload = await this.jwtService.verifyAsync(dto.token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      this.logger.warn('Reset password failed: Invalid token');
      throw new BadRequestException('Token is invalid or expired');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: {
        id: payload.sub,
      },
      data: {
        password: hash,
      },
    });
    this.logger.log(`Password reset successful. UserId=${payload.sub}`);
    return {
      message: 'Password reset successfully',
    };
  }
}
