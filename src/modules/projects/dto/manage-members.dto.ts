import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class ManageMembersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  userIds: string[];
}
