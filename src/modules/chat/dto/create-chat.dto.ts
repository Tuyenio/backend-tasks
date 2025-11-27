import { IsString, IsOptional, IsArray, IsUUID, IsEnum } from 'class-validator';

export enum ChatType {
  DIRECT = 'direct',
  GROUP = 'group',
}

export class CreateChatDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(ChatType)
  type: ChatType;

  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];
}
