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
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // System Settings
  @Get('settings')
  @RequirePermissions('settings.manage')
  async getAllSettings() {
    return this.adminService.getAllSettings();
  }

  @Get('settings/public')
  getPublicSettings() {
    return this.adminService.getPublicSettings();
  }

  @Get('settings/:key')
  @RequirePermissions('settings.view')
  async getSetting(@Param('key') key: string) {
    return this.adminService.getSetting(key);
  }

  @Patch('settings/:key')
  @RequirePermissions('settings.manage')
  async updateSetting(
    @Param('key') key: string,
    @Body() updateDto: UpdateSystemSettingDto,
  ) {
    return this.adminService.updateSetting(key, updateDto);
  }

  // Activity Logs
  @Get('activity-logs')
  @RequirePermissions('settings.manage')
  async getActivityLogs(@Query() query: QueryActivityLogDto) {
    return this.adminService.getActivityLogs(query);
  }

  @Delete('activity-logs/cleanup')
  @RequirePermissions('settings.manage')
  async clearOldActivityLogs(@Query('days') days: string = '90') {
    const deletedCount = await this.adminService.clearOldActivityLogs(
      parseInt(days),
    );
    return { deleted: deletedCount };
  }

  // Dashboard & Statistics
  @Get('dashboard/stats')
  @RequirePermissions('settings.view')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/user-activity')
  @RequirePermissions('settings.view')
  async getUserActivityStats(@Query('days') days: string = '30') {
    return this.adminService.getUserActivityStats(parseInt(days));
  }

  @Get('dashboard/recent-activity')
  @RequirePermissions('settings.view')
  async getRecentActivity(@Query('limit') limit: string = '20') {
    return this.adminService.getRecentActivity(parseInt(limit));
  }

  @Get('dashboard/top-users')
  @RequirePermissions('settings.view')
  async getTopUsers(@Query('limit') limit: string = '10') {
    return this.adminService.getTopUsers(parseInt(limit));
  }

  // System Health (Public endpoint for monitoring)
  @Get('health')
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  // Database Maintenance
  @Post('maintenance/cleanup')
  @RequirePermissions('settings.manage')
  async performDatabaseCleanup() {
    return this.adminService.performDatabaseCleanup();
  }

  // User Management
  @Get('users')
  @RequirePermissions('users.manage')
  async getAllUsers(@Query() query: any) {
    return this.adminService.getAllUsers(query);
  }

  @Patch('users/:id/lock')
  @RequirePermissions('users.manage')
  async lockUser(@Param('id') id: string) {
    const user = await this.adminService.lockUser(id);
    const { password, ...result } = user;
    return result;
  }

  @Patch('users/:id/unlock')
  @RequirePermissions('users.manage')
  async unlockUser(@Param('id') id: string) {
    const user = await this.adminService.unlockUser(id);
    const { password, ...result } = user;
    return result;
  }

  @Patch('users/:id/roles')
  @RequirePermissions('users.manage')
  async assignRoles(@Param('id') id: string, @Body('roleIds') roleIds: string[]) {
    const user = await this.adminService.assignRolesToUser(id, roleIds);
    const { password, ...result } = user;
    return result;
  }
}
