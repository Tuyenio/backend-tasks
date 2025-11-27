import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSystemSettingDto {
  @IsOptional()
  @IsString()
  value?: string;
}
