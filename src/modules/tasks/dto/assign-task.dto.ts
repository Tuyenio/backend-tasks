import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class AssignTaskDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  userIds: string[];
}
