import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Post()
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    const notification = await this.notificationsService.create(
      createNotificationDto,
    );

    // Send real-time notification
    this.notificationsGateway.sendNotificationToUser(
      createNotificationDto.userId,
      notification,
    );

    // Update unread count
    const unreadCount = await this.notificationsService.getUnreadCount(
      createNotificationDto.userId,
    );
    this.notificationsGateway.notifyUnreadCount(
      createNotificationDto.userId,
      unreadCount,
    );

    return notification;
  }

  @Post('bulk')
  async createBulk(@Body() createNotificationDtos: CreateNotificationDto[]) {
    const notifications = await this.notificationsService.createBulk(
      createNotificationDtos,
    );

    // Send real-time notifications
    notifications.forEach((notification) => {
      this.notificationsGateway.sendNotificationToUser(
        notification.user.id,
        notification,
      );
    });

    // Update unread counts for affected users
    const userIds = [...new Set(notifications.map((n) => n.user.id))];
    for (const userId of userIds) {
      const unreadCount = await this.notificationsService.getUnreadCount(userId);
      this.notificationsGateway.notifyUnreadCount(userId, unreadCount);
    }

    return notifications;
  }

  @Get()
  @RequirePermissions('notifications.view')
  findAll(@Query() query: QueryNotificationDto, @Request() req) {
    return this.notificationsService.findAll(query, req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Get('statistics')
  getStatistics(@Request() req) {
    return this.notificationsService.getStatistics(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.notificationsService.findOne(id, req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    const notification = await this.notificationsService.markAsRead(
      id,
      req.user.id,
    );

    // Update unread count
    const unreadCount = await this.notificationsService.getUnreadCount(
      req.user.id,
    );
    this.notificationsGateway.notifyUnreadCount(req.user.id, unreadCount);

    return notification;
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.id);

    // Update unread count to 0
    this.notificationsGateway.notifyUnreadCount(req.user.id, 0);

    return { message: 'All notifications marked as read' };
  }

  @Patch('read-multiple')
  async markMultipleAsRead(
    @Body() body: { ids: string[] },
    @Request() req,
  ) {
    const notifications = await this.notificationsService.markMultipleAsRead(
      body.ids,
      req.user.id,
    );

    // Update unread count
    const unreadCount = await this.notificationsService.getUnreadCount(
      req.user.id,
    );
    this.notificationsGateway.notifyUnreadCount(req.user.id, unreadCount);

    return notifications;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    await this.notificationsService.remove(id, req.user.id);

    // Update unread count
    const unreadCount = await this.notificationsService.getUnreadCount(
      req.user.id,
    );
    this.notificationsGateway.notifyUnreadCount(req.user.id, unreadCount);

    return { message: 'Notification deleted successfully' };
  }

  @Delete()
  async removeAll(@Request() req) {
    await this.notificationsService.removeAll(req.user.id);

    // Update unread count to 0
    this.notificationsGateway.notifyUnreadCount(req.user.id, 0);

    return { message: 'All notifications deleted successfully' };
  }
}
