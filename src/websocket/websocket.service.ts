import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class WebsocketService {
  private users = new Map<number, Socket[]>();

  addUser(userId: number, socket: Socket) {
    const sockets = this.users.get(userId) || [];

    sockets.push(socket);

    this.users.set(userId, sockets);
  }

  removeUser(socketId: string) {
    for (const [userId, sockets] of this.users) {
      const newSockets = sockets.filter((s) => s.id !== socketId);

      if (newSockets.length === 0) {
        this.users.delete(userId);
      } else {
        this.users.set(userId, newSockets);
      }
    }
  }

  sendToUser(userId: number, event: string, data: any) {
    const sockets = this.users.get(userId);

    if (!sockets) return;

    sockets.forEach((socket) => {
      socket.emit(event, data);
    });
  }
}
