import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '../../../entities/task.entity';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedHours?: number;
}
