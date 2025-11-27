import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  OTHER = 'other',
}

export class UploadFileDto {
  @IsEnum(FileType)
  type: FileType;

  @IsOptional()
  @IsString()
  entityType?: string; // task, project, note, message, user

  @IsOptional()
  @IsString()
  entityId?: string;
}
