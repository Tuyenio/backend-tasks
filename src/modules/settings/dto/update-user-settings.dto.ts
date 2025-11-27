import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export enum SettingType {
  LANGUAGE = 'language',
  TIMEZONE = 'timezone',
  DATE_FORMAT = 'date_format',
  TIME_FORMAT = 'time_format',
  THEME = 'theme',
  NOTIFICATIONS = 'notifications',
  EMAIL_NOTIFICATIONS = 'email_notifications',
}

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  timeFormat?: string;

  @IsOptional()
  @IsString()
  themeId?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;
}
