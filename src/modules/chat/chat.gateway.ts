import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

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

      // Notify others that user is online
      this.server.emit('user:online', { userId: client.userId });
      this.logger.log(`Client connected: ${client.id}, User: ${client.userId}`);
    } catch (error) {
      this.logger.error(
        'Connection error',
        error instanceof Error ? error.stack : undefined,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);

      // Notify others that user is offline
      this.server.emit('user:offline', { userId: client.userId });
      this.logger.log(
        `Client disconnected: ${client.id}, User: ${client.userId}`,
      );
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: CreateMessageDto,
  ) {
    try {
      if (!client.userId) {
        return { error: 'Unauthorized' };
      }

      const message = await this.chatService.createMessage(data, client.userId);

      // Get chat participants
      const chat = await this.chatService.findOne(data.chatId, client.userId);

      // Emit to all participants
      chat.members.forEach((participant) => {
        const socketId = this.connectedUsers.get(participant.id);
        if (socketId) {
          this.server.to(socketId).emit('message:new', message);
        }
      });

      return message;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: message };
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    try {
      if (!client.userId) {
        return;
      }

      const chat = await this.chatService.findOne(data.chatId, client.userId);

      // Emit to all participants except sender
      chat.members.forEach((participant) => {
        if (participant.id !== client.userId) {
          const socketId = this.connectedUsers.get(participant.id);
          if (socketId) {
            this.server.to(socketId).emit('typing:start', {
              chatId: data.chatId,
              userId: client.userId,
            });
          }
        }
      });
    } catch (error) {
      this.logger.error(
        'Typing start error',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    try {
      if (!client.userId) {
        return;
      }

      const chat = await this.chatService.findOne(data.chatId, client.userId);

      // Emit to all participants except sender
      chat.members.forEach((participant) => {
        if (participant.id !== client.userId) {
          const socketId = this.connectedUsers.get(participant.id);
          if (socketId) {
            this.server.to(socketId).emit('typing:stop', {
              chatId: data.chatId,
              userId: client.userId,
            });
          }
        }
      });
    } catch (error) {
      this.logger.error(
        'Typing stop error',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    try {
      if (!client.userId) {
        return { error: 'Unauthorized' };
      }

      const message = await this.chatService.markAsRead(
        data.messageId,
        client.userId,
      );

      // Notify sender
      const senderSocketId = this.connectedUsers.get(message.sender.id);
      if (senderSocketId) {
        this.server.to(senderSocketId).emit('message:read', {
          messageId: data.messageId,
          userId: client.userId,
        });
      }

      return message;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: message };
    }
  }

  @SubscribeMessage('online:check')
  handleOnlineCheck(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userIds: string[] },
  ) {
    const onlineUsers = data.userIds.filter((userId) =>
      this.connectedUsers.has(userId),
    );
    return { onlineUsers };
  }
}
