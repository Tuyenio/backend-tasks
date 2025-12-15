import {
  IsString,
  IsOptional,
  IsHexColor,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ProjectStatus } from '../../../entities/project.entity';

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}
