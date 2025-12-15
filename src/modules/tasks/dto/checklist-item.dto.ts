import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateChecklistItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateChecklistItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
