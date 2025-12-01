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
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('chats')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @RequirePermissions('chat.create')
  create(@Body() createChatDto: CreateChatDto, @Request() req) {
    return this.chatService.create(createChatDto, req.user.id);
  }

  @Get()
  findAll(@Query() query: QueryChatDto, @Request() req) {
    return this.chatService.findAll(query, req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    return this.chatService.getUnreadCount(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.chatService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateChatDto: UpdateChatDto,
    @Request() req,
  ) {
    return this.chatService.update(id, updateChatDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.chatService.remove(id, req.user.id);
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
      req.user.id,
    );
  }

  @Delete(':id/participants/:participantId')
  removeParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Request() req,
  ) {
    return this.chatService.removeParticipant(id, participantId, req.user.id);
  }

  @Post('messages')
  createMessage(@Body() createMessageDto: CreateMessageDto, @Request() req) {
    return this.chatService.createMessage(createMessageDto, req.user.id);
  }

  @Get('messages/list')
  getMessages(@Query() query: QueryMessageDto, @Request() req) {
    return this.chatService.getMessages(query, req.user.id);
  }

  @Post('messages/:messageId/read')
  markAsRead(@Param('messageId') messageId: string, @Request() req) {
    return this.chatService.markAsRead(messageId, req.user.id);
  }
}
