import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Chat } from '../../entities/chat.entity';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { CreateChatDto, ChatType } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { QueryChatDto } from './dto/query-chat.dto';
import { QueryMessageDto } from './dto/query-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatsRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createChatDto: CreateChatDto, userId: string): Promise<Chat> {
    const creator = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!creator) {
      throw new NotFoundException('User not found');
    }

    // Validate participants
    const allParticipantIds = [...createChatDto.participantIds, userId];
    const uniqueParticipantIds = [...new Set(allParticipantIds)];

    if (createChatDto.type === ChatType.DIRECT && uniqueParticipantIds.length !== 2) {
      throw new BadRequestException(
        'Direct chat must have exactly 2 participants',
      );
    }

    const participants = await this.usersRepository.findBy({
      id: In(uniqueParticipantIds),
    });

    if (participants.length !== uniqueParticipantIds.length) {
      throw new BadRequestException('One or more participants not found');
    }

    // Check if direct chat already exists
    if (createChatDto.type === ChatType.DIRECT) {
      const existingChat = await this.chatsRepository
        .createQueryBuilder('chat')
        .leftJoin('chat.participants', 'participant')
        .where('chat.type = :type', { type: ChatType.DIRECT })
        .andWhere('participant.id IN (:...ids)', { ids: uniqueParticipantIds })
        .groupBy('chat.id')
        .having('COUNT(DISTINCT participant.id) = :count', {
          count: uniqueParticipantIds.length,
        })
        .getOne();

      if (existingChat) {
        return this.findOne(existingChat.id, userId);
      }
    }

    const chat = this.chatsRepository.create({
      name: createChatDto.name,
      type: createChatDto.type,
    });
    chat.members = participants;

    return this.chatsRepository.save(chat);
  }

  async findAll(query: QueryChatDto, userId: string) {
    const { search, type, page = 1, limit = 20 } = query;

    const qb = this.chatsRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoin('chat.members', 'userMember')
      .where('userMember.id = :userId', { userId });

    if (search) {
      qb.andWhere('chat.name ILIKE :search', { search: `%${search}%` });
    }

    if (type) {
      qb.andWhere('chat.type = :type', { type });
    }

    qb.orderBy('lastMessage.createdAt', 'DESC', 'NULLS LAST')
      .addOrderBy('chat.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string): Promise<Chat> {
    const chat = await this.chatsRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Check if user is a participant
    const isParticipant = chat.members.some((p) => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this chat');
    }

    return chat;
  }

  async update(
    id: string,
    updateChatDto: UpdateChatDto,
    userId: string,
  ): Promise<Chat> {
    const chat = await this.findOne(id, userId);

    // Only group chats can be updated
    if (chat.type === ChatType.DIRECT) {
      throw new BadRequestException('Cannot update direct chat');
    }

    Object.assign(chat, updateChatDto);
    return this.chatsRepository.save(chat);
  }

  async remove(id: string, userId: string): Promise<void> {
    const chat = await this.findOne(id, userId);

    await this.chatsRepository.remove(chat);
  }

  async addParticipants(
    id: string,
    participantIds: string[],
    userId: string,
  ): Promise<Chat> {
    const chat = await this.findOne(id, userId);

    // Only group chats can add participants
    if (chat.type === ChatType.DIRECT) {
      throw new BadRequestException('Cannot add participants to direct chat');
    }

    const newParticipants = await this.usersRepository.findBy({
      id: In(participantIds),
    });

    if (newParticipants.length !== participantIds.length) {
      throw new BadRequestException('One or more users not found');
    }

    // Merge with existing participants
    const existingIds = chat.members.map((p) => p.id);
    const toAdd = newParticipants.filter((p) => !existingIds.includes(p.id));

    chat.members = [...chat.members, ...toAdd];

    return this.chatsRepository.save(chat);
  }

  async removeParticipant(
    id: string,
    participantId: string,
    userId: string,
  ): Promise<Chat> {
    const chat = await this.findOne(id, userId);

    // Only group chats can remove participants
    if (chat.type === ChatType.DIRECT) {
      throw new BadRequestException(
        'Cannot remove participants from direct chat',
      );
    }

    // Only the participant themselves can leave
    if (participantId !== userId) {
      throw new ForbiddenException(
        'You can only remove yourself from chat',
      );
    }

    chat.members = chat.members.filter((p) => p.id !== participantId);

    return this.chatsRepository.save(chat);
  }

  async createMessage(
    createMessageDto: CreateMessageDto,
    userId: string,
  ): Promise<Message> {
    const chat = await this.findOne(createMessageDto.chatId, userId);

    const sender = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!sender) {
      throw new NotFoundException('User not found');
    }

    const message = this.messagesRepository.create({
      content: createMessageDto.content,
      type: createMessageDto.type,
    });
    
    if (createMessageDto.attachmentUrl) {
      message.attachmentUrls = [createMessageDto.attachmentUrl];
    }
    
    message.chat = chat;
    message.sender = sender;

    return this.messagesRepository.save(message);
  }

  async getMessages(query: QueryMessageDto, userId: string) {
    const chat = await this.findOne(query.chatId, userId);

    const { page = 1, limit = 50 } = query;

    const [items, total] = await this.messagesRepository.findAndCount({
      where: { chat: { id: chat.id } },
      relations: ['sender', 'readBy'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.reverse(), // Reverse to show oldest first
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.messagesRepository.findOne({
      where: { id: messageId },
      relations: ['chat', 'chat.members', 'readBy', 'sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is a participant
    const isParticipant = message.chat.members.some((p) => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this chat');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Add user to readBy if not already there
    if (!message.readBy) {
      message.readBy = [];
    }

    const alreadyRead = message.readBy.some((u) => u.id === userId);
    if (!alreadyRead) {
      message.readBy.push(user);
      await this.messagesRepository.save(message);
    }

    return message;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const chats = await this.chatsRepository
      .createQueryBuilder('chat')
      .leftJoin('chat.members', 'member')
      .where('member.id = :userId', { userId })
      .getMany();

    let unreadCount = 0;

    for (const chat of chats) {
      const count = await this.messagesRepository
        .createQueryBuilder('message')
        .leftJoin('message.chat', 'chat')
        .leftJoin('message.readBy', 'readBy')
        .leftJoin('message.sender', 'sender')
        .where('chat.id = :chatId', { chatId: chat.id })
        .andWhere('sender.id != :userId', { userId })
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('1')
            .from('message_read_by', 'mrb')
            .where('mrb.message_id = message.id')
            .andWhere('mrb.user_id = :userId')
            .getQuery();
          return `NOT EXISTS ${subQuery}`;
        })
        .setParameter('userId', userId)
        .getCount();

      unreadCount += count;
    }

    return unreadCount;
  }
}
