import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
}

export class CreateMessageDto {
  @IsString()
  content: string;

  @IsUUID('4')
  chatId: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType = MessageType.TEXT;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
