import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from '../../entities/theme.entity';
import { UserSettings } from '../../entities/user-settings.entity';
import { User } from '../../entities/user.entity';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Theme)
    private themesRepository: Repository<Theme>,
    @InjectRepository(UserSettings)
    private userSettingsRepository: Repository<UserSettings>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Themes Management
  async createTheme(createDto: CreateThemeDto, userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tÌm thấy');
    }

    const theme = this.themesRepository.create({
      ...createDto,
      createdBy: user,
    });

    return this.themesRepository.save(theme);
  }

  async getAllThemes(userId?: string) {
    const qb = this.themesRepository
      .createQueryBuilder('theme')
      .leftJoinAndSelect('theme.createdBy', 'user');

    if (userId) {
      qb.where('theme.isPublic = :isPublic OR user.id = :userId', {
        isPublic: true,
        userId,
      });
    } else {
      qb.where('theme.isPublic = :isPublic', { isPublic: true });
    }

    return qb.orderBy('theme.createdAt', 'DESC').getMany();
  }

  async getThemeById(id: string) {
    const theme = await this.themesRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!theme) {
      throw new NotFoundException('Chủ đề không tÌm thấy');
    }

    return theme;
  }

  async updateTheme(id: string, updateDto: UpdateThemeDto, userId: string) {
    const theme = await this.getThemeById(id);

    if (theme.createdBy.id !== userId) {
      throw new BadRequestException('Bạn chỉ có thể cập nhật chủ đề của riêng mình');
    }

    Object.assign(theme, updateDto);
    return this.themesRepository.save(theme);
  }

  async deleteTheme(id: string, userId: string) {
    const theme = await this.getThemeById(id);

    if (theme.createdBy.id !== userId) {
      throw new BadRequestException('Bạn chỉ có thể xóa chủ đề của riêng mình');
    }

    await this.themesRepository.remove(theme);
    return { message: 'Chủ đề đã bị xóa thành công' };
  }

  async getDefaultThemes() {
    return this.themesRepository.find({
      where: { isPublic: true },
      order: { createdAt: 'ASC' },
      take: 10,
    });
  }

  // User Settings Management
  async getUserSettings(userId: string) {
    let settings = await this.userSettingsRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'theme'],
    });

    if (!settings) {
      // Create default settings if not exists
      settings = await this.createDefaultSettings(userId);
    }

    return settings;
  }

  private async createDefaultSettings(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tÌm thấy');
    }

    const settings = this.userSettingsRepository.create({
      user,
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      emailNotifications: true,
      pushNotifications: true,
      soundEnabled: true,
    });

    return this.userSettingsRepository.save(settings);
  }

  async updateUserSettings(userId: string, updateDto: UpdateUserSettingsDto) {
    let settings = await this.userSettingsRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!settings) {
      settings = await this.createDefaultSettings(userId);
    }

    // If theme is being updated, validate it exists
    if (updateDto.themeId) {
      const theme = await this.themesRepository.findOne({
        where: { id: updateDto.themeId },
      });
      if (!theme) {
        throw new NotFoundException('Chủ đề không tìm thấy');
      }
      settings.theme = theme;
      delete updateDto.themeId;
    }

    Object.assign(settings, updateDto);
    return this.userSettingsRepository.save(settings);
  }

  async resetUserSettings(userId: string) {
    const settings = await this.userSettingsRepository.findOne({
      where: { user: { id: userId } },
    });

    if (settings) {
      await this.userSettingsRepository.remove(settings);
    }

    return this.createDefaultSettings(userId);
  }

  // System defaults
  async getSystemDefaults() {
    return {
      languages: ['en', 'vi', 'ja', 'ko', 'zh'],
      timezones: [
        'UTC',
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Ho_Chi_Minh',
      ],
      dateFormats: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY'],
      timeFormats: ['24h', '12h'],
    };
  }
}
