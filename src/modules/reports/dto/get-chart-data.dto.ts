import { IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum ChartType {
  TASK_STATUS = 'task_status',
  TASK_PRIORITY = 'task_priority',
  PROJECT_STATUS = 'project_status',
  USER_ACTIVITY = 'user_activity',
  TASK_COMPLETION_TREND = 'task_completion_trend',
}

export class GetChartDataDto {
  @IsEnum(ChartType)
  type: ChartType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
