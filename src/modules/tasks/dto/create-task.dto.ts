import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsUUID,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '../../../entities/task.entity';

export class CreateTaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title: string;

  @IsString()
  description: string;

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

  @IsUUID('4')
  projectId: string;

  @IsOptional()
  @IsUUID('4')
  assignedById?: string;
}
