import {
  BadRequestException,
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
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { addDays } from 'date-fns';
import { Response } from 'express';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  sid: string;
  jti: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}
  private async limitSession(userId: number) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revoked: false,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    if (sessions.length > 0) {
      await this.prisma.session.update({
        where: {
          id: sessions[0].id,
        },

        data: {
          revoked: true,
        },
      });
    }
  }
  async register(data: RegisterDto) {
    this.logger.log(`Register request: ${data.email}`);
    const existUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existUser) {
      this.logger.warn(`Register failed: Email ${data.email} already exists`);
      throw new BadRequestException('Registration failed');
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
      success: true,
    };
  }

  async login(dto: LoginDto, ip: string, agent: string, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
        isDelete: false,
      },
    });

    if (!user) throw new UnauthorizedException();

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account locked');
    }

    const valid = await bcrypt.compare(dto.password, user.password);

    if (!valid) {
      const count = user.loginFailedCount + 1;

      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          loginFailedCount: count,

          lockedUntil:
            count >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });

      throw new UnauthorizedException();
    }

    const sessionId = randomUUID();
    const refreshJti = randomUUID();

    await this.limitSession(user.id);

    await this.prisma.$transaction([
      this.prisma.session.create({
        data: {
          userId: user.id,
          sessionId,
          refreshJti,
          ipAddress: ip,
          userAgent: agent,
          expiredAt: addDays(new Date(), 7),
        },
      }),

      this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          loginFailedCount: 0,
          lockedUntil: null,
        },
      }),
    ]);

    const tokens = await this.generateTokens(user, sessionId, refreshJti);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    // console.log(res.getHeader('Set-Cookie'));
    return {
      accessToken: tokens.accessToken,
    };
  }

  async generateTokens(user: User, sid: string, jti: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid,
      jti,
      version: user.tokenVersion,
    };

    return {
      accessToken: this.jwtService.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),

      refreshToken: this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    };
  }
  async refreshToken(token: string, res: Response) {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException();
    }

    const session = await this.prisma.session.findUnique({
      where: {
        sessionId: payload.sid,
      },
    });

    if (!session) throw new UnauthorizedException();

    //
    // Detect reuse attack
    //

    if (session.revoked || session.refreshJti !== payload.jti) {
      await this.prisma.session.updateMany({
        where: {
          userId: session.userId,
        },

        data: {
          revoked: true,
        },
      });

      throw new UnauthorizedException('Token reuse detected');
    }

    if (session.expiredAt < new Date()) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user) throw new UnauthorizedException();

    const newSid = randomUUID();

    const newJti = randomUUID();

    await this.prisma.$transaction([
      this.prisma.session.update({
        where: {
          sessionId: session.sessionId,
        },

        data: {
          revoked: true,
        },
      }),

      this.prisma.session.create({
        data: {
          userId: user.id,
          sessionId: newSid,
          refreshJti: newJti,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          expiredAt: addDays(new Date(), 7),
        },
      }),
    ]);

    const tokens = await this.generateTokens(user, newSid, newJti);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  async logout(sessionId: string, res: Response) {
    await this.prisma.session.updateMany({
      where: {
        sessionId,
      },

      data: {
        revoked: true,
      },
    });
    res.clearCookie('refreshToken', {
      path: '/',
    });

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
      // Bảo mật: Không tiết lộ email có tồn tại trong hệ thống hay không
      return {
        message: 'If the email exists, a reset link has been sent.',
      };
    }

    // Xóa các token reset cũ chưa dùng của user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const rawToken = randomBytes(32).toString('hex');
    // Mã hóa token bằng SHA-256 để lưu DB (tìm kiếm cực nhanh O(1))
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiredAt: new Date(Date.now() + 15 * 60 * 1000), // Hạn 15 phút
      },
    });

    await this.mailService.sendResetPasswordEmail(user.email, rawToken);

    return { message: 'Please check your email' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Hash token gửi lên bằng SHA-256 để so sánh trực tiếp trong DB
    const incomingHash = createHash('sha256').update(dto.token).digest('hex');

    const matchedToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: incomingHash,
        used: false,
        expiredAt: { gt: new Date() },
      },
    });

    if (!matchedToken) {
      throw new BadRequestException('Token invalid or expired');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction([
      // Cập nhật mật khẩu mới
      this.prisma.user.update({
        where: { id: matchedToken.userId },
        data: {
          password: hash,
          passwordChangedAt: new Date(),
        },
      }),

      // Đánh dấu token đã sử dụng
      this.prisma.passwordResetToken.update({
        where: { id: matchedToken.id },
        data: { used: true },
      }),

      // Đăng xuất khỏi toàn bộ thiết bị
      this.prisma.session.updateMany({
        where: { userId: matchedToken.userId },
        data: { revoked: true },
      }),
    ]);

    return { message: 'Password reset successfully', success: true };
  }

  async logoutAll(userId: number, res: Response) {
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: {
          userId,
        },

        data: {
          revoked: true,
        },
      }),
      this.prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          tokenVersion: {
            increment: 1,
          },
        },
      }),
    ]);
    res.clearCookie('refreshToken', {
      path: '/',
    });

    return {
      message: 'All devices logged out',
      success: true,
    };
  }
}
