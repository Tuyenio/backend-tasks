import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateThemeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;
}
