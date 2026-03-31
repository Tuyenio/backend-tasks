import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Notification } from '../../entities/notification.entity';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const auth = client.handshake.auth as Record<string, unknown> | undefined;
      const authToken =
        auth && typeof auth.token === 'string' ? auth.token : undefined;
      const headerToken = client.handshake.headers.authorization;

      const tokenFromAuth = authToken;
      const tokenFromHeader =
        typeof headerToken === 'string' ? headerToken.split(' ')[1] : undefined;

      const token: string | undefined = tokenFromAuth ?? tokenFromHeader;

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      client.userId = payload.sub;

      if (client.userId) {
        this.connectedUsers.set(client.userId, client.id);
      }

      this.logger.log(
        `Notification client connected: ${client.id}, User: ${client.userId}`,
      );
    } catch (error) {
      this.logger.error(
        'Notification connection error',
        error instanceof Error ? error.stack : undefined,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(
        `Notification client disconnected: ${client.id}, User: ${client.userId}`,
      );
    }
  }

  sendNotificationToUser(userId: string, notification: Notification) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification:new', notification);
    }
  }

  sendNotificationToMultipleUsers(
    userIds: string[],
    notification: Notification,
  ) {
    userIds.forEach((userId) => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  notifyUnreadCount(userId: string, count: number) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification:unread-count', { count });
    }
  }
}
