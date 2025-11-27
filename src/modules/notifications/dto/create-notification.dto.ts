import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { NotificationType } from '../../../entities/notification.entity';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsUUID('4')
  userId: string;

  @IsOptional()
  @IsString()
  link?: string;
}
