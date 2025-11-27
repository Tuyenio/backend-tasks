import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { QueryChatDto } from './dto/query-chat.dto';
import { QueryMessageDto } from './dto/query-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  create(@Body() createChatDto: CreateChatDto, @Request() req) {
    return this.chatService.create(createChatDto, req.user.userId);
  }

  @Get()
  findAll(@Query() query: QueryChatDto, @Request() req) {
    return this.chatService.findAll(query, req.user.userId);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    return this.chatService.getUnreadCount(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.chatService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateChatDto: UpdateChatDto,
    @Request() req,
  ) {
    return this.chatService.update(id, updateChatDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.chatService.remove(id, req.user.userId);
  }

  @Post(':id/participants')
  addParticipants(
    @Param('id') id: string,
    @Body() body: { participantIds: string[] },
    @Request() req,
  ) {
    return this.chatService.addParticipants(
      id,
      body.participantIds,
      req.user.userId,
    );
  }

  @Delete(':id/participants/:participantId')
  removeParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Request() req,
  ) {
    return this.chatService.removeParticipant(id, participantId, req.user.userId);
  }

  @Post('messages')
  createMessage(@Body() createMessageDto: CreateMessageDto, @Request() req) {
    return this.chatService.createMessage(createMessageDto, req.user.userId);
  }

  @Get('messages/list')
  getMessages(@Query() query: QueryMessageDto, @Request() req) {
    return this.chatService.getMessages(query, req.user.userId);
  }

  @Post('messages/:messageId/read')
  markAsRead(@Param('messageId') messageId: string, @Request() req) {
    return this.chatService.markAsRead(messageId, req.user.userId);
  }
}
