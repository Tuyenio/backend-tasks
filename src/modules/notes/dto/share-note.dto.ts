import { IsArray, IsUUID } from 'class-validator';

export class ShareNoteDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];
}
