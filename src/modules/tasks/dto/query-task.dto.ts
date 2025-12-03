import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsUUID, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus, TaskPriority } from '../../../entities/task.entity';

export class QueryTaskDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @IsOptional()
  @IsUUID('4')
  assigneeId?: string;

  @IsOptional()
  @IsUUID('4')
  createdById?: string;

  @IsOptional()
  @IsUUID('4')
  tagId?: string;

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @IsOptional()
  @IsString()
  overdue?: string; // 'true' or 'false'

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
