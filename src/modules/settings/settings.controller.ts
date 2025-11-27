import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Themes endpoints
  @Post('themes')
  async createTheme(@Body() createDto: CreateThemeDto, @Request() req) {
    return this.settingsService.createTheme(createDto, req.user.id);
  }

  @Get('themes')
  async getAllThemes(@Request() req) {
    return this.settingsService.getAllThemes(req.user.id);
  }

  @Get('themes/defaults')
  async getDefaultThemes() {
    return this.settingsService.getDefaultThemes();
  }

  @Get('themes/:id')
  async getThemeById(@Param('id') id: string) {
    return this.settingsService.getThemeById(id);
  }

  @Patch('themes/:id')
  async updateTheme(
    @Param('id') id: string,
    @Body() updateDto: UpdateThemeDto,
    @Request() req,
  ) {
    return this.settingsService.updateTheme(id, updateDto, req.user.id);
  }

  @Delete('themes/:id')
  async deleteTheme(@Param('id') id: string, @Request() req) {
    return this.settingsService.deleteTheme(id, req.user.id);
  }

  // User settings endpoints
  @Get('user')
  async getUserSettings(@Request() req) {
    return this.settingsService.getUserSettings(req.user.id);
  }

  @Patch('user')
  async updateUserSettings(
    @Body() updateDto: UpdateUserSettingsDto,
    @Request() req,
  ) {
    return this.settingsService.updateUserSettings(req.user.id, updateDto);
  }

  @Post('user/reset')
  async resetUserSettings(@Request() req) {
    return this.settingsService.resetUserSettings(req.user.id);
  }

  @Get('defaults')
  async getSystemDefaults() {
    return this.settingsService.getSystemDefaults();
  }
}
