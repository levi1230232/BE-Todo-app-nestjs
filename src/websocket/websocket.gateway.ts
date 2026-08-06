import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WebsocketService } from './websocket.service';

@WebSocketGateway({
  cors: {
    origin: '*',
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
  ) {}

  async handleConnection(client: Socket) {
    try {
      const rawToken =
        client.handshake.auth?.token || client.handshake.headers?.authorization;

      if (!rawToken) {
        console.warn(
          `[Gateway] Connection rejected: Missing token (${client.id})`,
        );
        client.disconnect();
        return;
      }

      const token = rawToken.startsWith('Bearer ')
        ? rawToken.split(' ')[1]
        : rawToken;

      const payload = await this.jwtService.verifyAsync(token);

      client.data.user = payload;

      this.websocketService.addUser(payload.sub, client);

      console.log(`⚡ User ${payload.sub} connected (${client.id})`);
    } catch (error: any) {
      console.error(`❌ Connection failed (${client.id}):`, error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.websocketService.removeUser(client.id);
    console.log(`❌ ${client.id} disconnected`);
  }
}
