import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

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

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.userId = payload.sub;

      if (client.userId) {
        this.connectedUsers.set(client.userId, client.id);
      }

      // Notify others that user is online
      this.server.emit('user:online', { userId: client.userId });

      console.log(`Client connected: ${client.id}, User: ${client.userId}`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);

      // Notify others that user is offline
      this.server.emit('user:offline', { userId: client.userId });

      console.log(`Client disconnected: ${client.id}, User: ${client.userId}`);
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
      return { error: error.message };
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
      console.error('Typing start error:', error);
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
      console.error('Typing stop error:', error);
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
      return { error: error.message };
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
