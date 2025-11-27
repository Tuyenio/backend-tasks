import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';
import { QueryActivityLogDto } from './dto/query-activity-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private checkAdminPermission(user: any) {
    if (!user.roles || !user.roles.some((role: any) => 
      ['super_admin', 'admin'].includes(role.name)
    )) {
      throw new ForbiddenException('Admin access required');
    }
  }

  // System Settings
  @Get('settings')
  async getAllSettings(@Request() req) {
    this.checkAdminPermission(req.user);
    return this.adminService.getAllSettings();
  }

  @Get('settings/public')
  getPublicSettings() {
    return this.adminService.getPublicSettings();
  }

  @Get('settings/:key')
  async getSetting(@Param('key') key: string, @Request() req) {
    this.checkAdminPermission(req.user);
    return this.adminService.getSetting(key);
  }

  @Patch('settings/:key')
  async updateSetting(
    @Param('key') key: string,
    @Body() updateDto: UpdateSystemSettingDto,
    @Request() req,
  ) {
    this.checkAdminPermission(req.user);
    return this.adminService.updateSetting(key, updateDto);
  }

  // Activity Logs
  @Get('activity-logs')
  async getActivityLogs(@Query() query: QueryActivityLogDto, @Request() req) {
    this.checkAdminPermission(req.user);
    return this.adminService.getActivityLogs(query);
  }

  @Delete('activity-logs/cleanup')
  async clearOldActivityLogs(
    @Query('days') days: string = '90',
    @Request() req,
  ) {
    this.checkAdminPermission(req.user);
    const deletedCount = await this.adminService.clearOldActivityLogs(
      parseInt(days),
    );
    return { deleted: deletedCount };
  }

  // Dashboard & Statistics
  @Get('dashboard/stats')
  async getDashboardStats(@Request() req) {
    this.checkAdminPermission(req.user);
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/user-activity')
  async getUserActivityStats(
    @Query('days') days: string = '30',
    @Request() req,
  ) {
    this.checkAdminPermission(req.user);
    return this.adminService.getUserActivityStats(parseInt(days));
  }

  @Get('dashboard/recent-activity')
  async getRecentActivity(
    @Query('limit') limit: string = '20',
    @Request() req,
  ) {
    this.checkAdminPermission(req.user);
    return this.adminService.getRecentActivity(parseInt(limit));
  }

  @Get('dashboard/top-users')
  async getTopUsers(
    @Query('limit') limit: string = '10',
    @Request() req,
  ) {
    this.checkAdminPermission(req.user);
    return this.adminService.getTopUsers(parseInt(limit));
  }

  // System Health
  @Get('health')
  async getSystemHealth(@Request() req) {
    this.checkAdminPermission(req.user);
    return this.adminService.getSystemHealth();
  }

  // Database Maintenance
  @Post('maintenance/cleanup')
  async performDatabaseCleanup(@Request() req) {
    this.checkAdminPermission(req.user);
    return this.adminService.performDatabaseCleanup();
  }
}
