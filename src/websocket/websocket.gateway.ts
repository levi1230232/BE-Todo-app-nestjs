import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { UnauthorizedException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

import { WebsocketService } from './websocket.service';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  sid: string;
  iat: number;
  exp?: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },

  pingTimeout: 60000,
  pingInterval: 25000,
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly websocketService: WebsocketService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    // console.log('🔥 [Gateway] HANDLE CONNECTION:', client.id);

    try {
      const rawToken =
        client.handshake.auth?.token ?? client.handshake.headers?.authorization;

      if (!rawToken) {
        throw new UnauthorizedException('Missing token');
      }

      const token = rawToken.startsWith('Bearer ')
        ? rawToken.substring(7)
        : rawToken;

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      // console.log('✅ [Gateway] JWT verified:', {
      //   sub: payload.sub,
      //   sid: payload.sid,
      // });

      const userId = Number(payload.sub);

      if (!userId || !payload.sid) {
        throw new UnauthorizedException('Invalid JWT payload');
      }

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

      if ('userId' in session && session.userId !== userId) {
        throw new UnauthorizedException('Invalid session');
      }

      client.data.user = payload;
      client.data.userId = userId;
      client.data.sessionId = payload.sid;

      this.websocketService.addUser(userId, client);

      // console.log(`⚡ [Gateway] User ${userId} connected (${client.id})`);
    } catch (error: any) {
      // console.error('❌ [Gateway] Connection failed:', error?.message);

      client.emit('auth_error', {
        message: error?.message || 'WebSocket authentication failed',
      });

      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // console.log('❌ [Gateway] handleDisconnect:', {
    //   socketId: client.id,
    //   userId: client.data?.userId,
    // });

    this.websocketService.removeUser(client.id);
  }
}
