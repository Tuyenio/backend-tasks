import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const user = await this.usersRepository.findOne({
      where: { id: createNotificationDto.userId },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tìm thấy');
    }

    const notification = this.notificationsRepository.create({
      title: createNotificationDto.title,
      message: createNotificationDto.message,
      link: createNotificationDto.link,
    });
    notification.type = createNotificationDto.type;
    notification.user = user;

    return this.notificationsRepository.save(notification);
  }

  async createBulk(
    createNotificationDtos: CreateNotificationDto[],
  ): Promise<Notification[]> {
    const notifications = await Promise.all(
      createNotificationDtos.map((dto) => this.create(dto)),
    );
    return notifications;
  }

  async findAll(query: QueryNotificationDto, userId: string) {
    const { read, type, page = 1, limit = 20 } = query;

    const qb = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (read !== undefined) {
      qb.andWhere('notification.read = :read', { read });
    }

    if (type) {
      qb.andWhere('notification.type = :type', { type });
    }

    qb.orderBy('notification.createdAt', 'DESC')
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

  async findOne(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!notification) {
      throw new NotFoundException('Thông báo không tìm thấy');
    }

    if (notification.user.id !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập thông báo này',
      );
    }

    return notification;
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.findOne(id, userId);
    notification.read = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { user: { id: userId }, read: false },
      { read: true },
    );
  }

  async markMultipleAsRead(
    ids: string[],
    userId: string,
  ): Promise<Notification[]> {
    const notifications = await this.notificationsRepository.find({
      where: { id: In(ids), user: { id: userId } },
      relations: ['user'],
    });

    notifications.forEach((notification) => {
      notification.read = true;
    });

    return this.notificationsRepository.save(notifications);
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.findOne(id, userId);
    await this.notificationsRepository.remove(notification);
  }

  async removeAll(userId: string): Promise<void> {
    await this.notificationsRepository.delete({
      user: { id: userId },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { user: { id: userId }, read: false },
    });
  }

  async getStatistics(userId: string) {
    const total = await this.notificationsRepository.count({
      where: { user: { id: userId } },
    });

    const unread = await this.getUnreadCount(userId);

    const byType = await this.notificationsRepository
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('notification.userId = :userId', { userId })
      .groupBy('notification.type')
      .getRawMany();

    return {
      total,
      unread,
      read: total - unread,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }
}
