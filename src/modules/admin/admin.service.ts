import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { SystemSetting } from '../../entities/system-setting.entity';
import { ActivityLog } from '../../entities/activity-log.entity';
import { User } from '../../entities/user.entity';
import { Project, ProjectStatus } from '../../entities/project.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { Note } from '../../entities/note.entity';
import { Chat } from '../../entities/chat.entity';
import { Notification } from '../../entities/notification.entity';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';
import { QueryActivityLogDto } from './dto/query-activity-log.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(SystemSetting)
    private systemSettingsRepository: Repository<SystemSetting>,
    @InjectRepository(ActivityLog)
    private activityLogsRepository: Repository<ActivityLog>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(Chat)
    private chatsRepository: Repository<Chat>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  // System Settings
  async getAllSettings(): Promise<SystemSetting[]> {
    return this.systemSettingsRepository.find({
      order: { key: 'ASC' },
    });
  }

  async getPublicSettings(): Promise<SystemSetting[]> {
    // Return all settings that are meant to be public (can be filtered by key prefix if needed)
    return this.systemSettingsRepository.find({
      order: { key: 'ASC' },
    });
  }

  async getSetting(key: string): Promise<SystemSetting> {
    const setting = await this.systemSettingsRepository.findOne({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    return setting;
  }

  async updateSetting(
    key: string,
    updateDto: UpdateSystemSettingDto,
  ): Promise<SystemSetting> {
    const setting = await this.getSetting(key);
    Object.assign(setting, updateDto);
    return this.systemSettingsRepository.save(setting);
  }

  // Activity Logs
  async getActivityLogs(query: QueryActivityLogDto) {
    const {
      userId,
      action,
      entityType,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query;

    const qb = this.activityLogsRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('log.project', 'project');

    if (userId) {
      qb.andWhere('log.userId = :userId', { userId });
    }

    if (action) {
      qb.andWhere('log.action = :action', { action });
    }

    if (entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType });
    }

    if (startDate && endDate) {
      qb.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      qb.andWhere('log.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      qb.andWhere('log.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async clearOldActivityLogs(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.activityLogsRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  // Dashboard Statistics
  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      totalNotes,
      totalChats,
      totalNotifications,
      unreadNotifications,
    ] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({ where: { isActive: true } }),
      this.projectsRepository.count(),
      this.projectsRepository.count({ where: { status: ProjectStatus.ACTIVE } }),
      this.tasksRepository.count(),
      this.tasksRepository.count({ where: { status: TaskStatus.DONE } }),
      this.tasksRepository
        .createQueryBuilder('task')
        .where('task.dueDate < :now', { now: new Date() })
        .andWhere('task.status != :status', { status: TaskStatus.DONE })
        .getCount(),
      this.notesRepository.count(),
      this.chatsRepository.count(),
      this.notificationsRepository.count(),
      this.notificationsRepository.count({ where: { read: false } }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      projects: {
        total: totalProjects,
        active: activeProjects,
        archived: totalProjects - activeProjects,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: totalTasks - completedTasks,
        overdue: overdueTasks,
      },
      content: {
        notes: totalNotes,
        chats: totalChats,
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
      },
    };
  }

  // User Activity Stats
  async getUserActivityStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await this.activityLogsRepository
      .createQueryBuilder('log')
      .select('DATE(log.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt >= :startDate', { startDate })
      .groupBy('DATE(log.createdAt)')
      .orderBy('DATE(log.createdAt)', 'ASC')
      .getRawMany();

    return activities.map((item) => ({
      date: item.date,
      count: parseInt(item.count),
    }));
  }

  // System Health Check
  async getSystemHealth() {
    const dbConnected = await this.checkDatabaseConnection();
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      status: dbConnected ? 'healthy' : 'unhealthy',
      database: {
        connected: dbConnected,
      },
      server: {
        uptime: Math.floor(uptime),
        memoryUsage: {
          rss: Math.floor(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.floor(memoryUsage.external / 1024 / 1024),
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      await this.usersRepository.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Recent Activity
  async getRecentActivity(limit: number = 20) {
    return this.activityLogsRepository.find({
      relations: ['user', 'project'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // Top Users (by activity)
  async getTopUsers(limit: number = 10) {
    const topUsers = await this.activityLogsRepository
      .createQueryBuilder('log')
      .select('log.userId', 'userId')
      .addSelect('user.fullName', 'fullName')
      .addSelect('user.email', 'email')
      .addSelect('COUNT(*)', 'activityCount')
      .leftJoin('log.user', 'user')
      .groupBy('log.userId')
      .addGroupBy('user.fullName')
      .addGroupBy('user.email')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();

    return topUsers.map((item) => ({
      userId: item.userId,
      fullName: item.fullName,
      email: item.email,
      activityCount: parseInt(item.activityCount),
    }));
  }

  // Database Cleanup
  async performDatabaseCleanup() {
    const [
      deletedLogs,
      deletedSessions,
      deletedNotifications,
    ] = await Promise.all([
      this.clearOldActivityLogs(90),
      this.usersRepository.query(
        "DELETE FROM user_sessions WHERE \"lastActiveAt\" < NOW() - INTERVAL '30 days'",
      ),
      this.notificationsRepository
        .createQueryBuilder()
        .delete()
        .where('read = true')
        .andWhere('createdAt < NOW() - INTERVAL \'60 days\'')
        .execute(),
    ]);

    return {
      deletedActivityLogs: deletedLogs,
      deletedSessions: deletedSessions[1] || 0,
      deletedNotifications: deletedNotifications.affected || 0,
    };
  }
}
