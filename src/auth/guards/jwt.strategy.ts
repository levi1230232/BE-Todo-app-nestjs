import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from 'src/prisma/prisma.service';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  sid: string;
  version: number;
  iat: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    /**
     * 1. Check user
     */
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    /**
     * 2. Check token version
     *
     * Dùng cho logout all device
     *
     */
    if (user.tokenVersion !== payload.version) {
      throw new UnauthorizedException('Token revoked');
    }

    /**
     * 3. Password change revoke token
     *
     */
    if (
      user.passwordChangedAt &&
      payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      throw new UnauthorizedException('Token expired after password change');
    }

    /**
     * 4. Check session
     *
     */
    const session = await this.prisma.session.findUnique({
      where: {
        sessionId: payload.sid,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.revoked) {
      throw new UnauthorizedException('Session revoked');
    }

    if (session.expiredAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    /**
     * Return request.user
     */
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      sid: session.sessionId,
    };
  }
}
