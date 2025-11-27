import { IsString, IsDateString, MinLength, MaxLength } from 'class-validator';

export class CreateReminderDto {
  @IsDateString()
  reminderDate: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;
}
