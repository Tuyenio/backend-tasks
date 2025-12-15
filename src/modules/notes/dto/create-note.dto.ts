import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sharedWithUserIds?: string[];

  @IsOptional()
  @IsString()
  todos?: string; // JSON stringified array of todo items
}
