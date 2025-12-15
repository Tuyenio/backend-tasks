import {
  IsString,
  IsOptional,
  IsHexColor,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
