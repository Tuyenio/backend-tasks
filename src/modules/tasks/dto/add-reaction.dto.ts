import { IsString, MaxLength } from 'class-validator';

export class AddReactionDto {
  @IsString()
  @MaxLength(10)
  emoji: string;
}
