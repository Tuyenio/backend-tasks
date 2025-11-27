import { IsString, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;
}
