import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';

export enum ReportType {
  TASKS = 'tasks',
  PROJECTS = 'projects',
  USERS = 'users',
  ACTIVITY = 'activity',
  PERFORMANCE = 'performance',
}

export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
}

export class GenerateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;
}
