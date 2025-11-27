import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class ManageTagsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  tagIds: string[];
}
