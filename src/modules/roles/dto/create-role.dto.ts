import {
  IsString,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
  IsHexColor,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
