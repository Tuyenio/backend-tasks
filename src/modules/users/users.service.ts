import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { UserSettings } from '../../entities/user-settings.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { EmailService } from '../email/email.service';
import { ChatService } from '../chat/chat.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(UserSettings)
    private userSettingsRepository: Repository<UserSettings>,
    private emailService: EmailService,
    private chatService: ChatService,
  ) {}

  async findAll(
    query: QueryUserDto,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const { search, status, isActive, department, roleId, sortBy, sortOrder } =
      query;
    const page = query.page || 1;
    const limit = query.limit || 10;

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role');

    // Search by name or email
    if (search) {
      queryBuilder.where(
        '(user.name LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // Filter by active status
    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    // Filter by department
    if (department) {
      queryBuilder.andWhere('user.department = :department', { department });
    }

    // Filter by role
    if (roleId) {
      queryBuilder.andWhere('role.id = :roleId', { roleId });
    }

    // Sorting
    const orderDirection = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`user.${sortBy}`, orderDirection);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${id} không tìm thấy`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if email already exists
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Hash password
    const plainPassword = createUserDto.password; // Store for email
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Handle name - split if provided, otherwise use firstName/lastName
    let finalName = '';
    if (createUserDto.name) {
      finalName = createUserDto.name;
    } else if (createUserDto.firstName || createUserDto.lastName) {
      finalName =
        `${createUserDto.firstName || ''} ${createUserDto.lastName || ''}`.trim();
    }

    // Get roles - either from roleIds or default to member
    let roles: Role[] = [];
    if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
      roles = await this.rolesRepository.find({
        where: { id: In(createUserDto.roleIds) },
      });
      if (roles.length !== createUserDto.roleIds.length) {
        throw new BadRequestException('Một số vai trò không tìm thấy');
      }
    } else {
      // Get default member role
      const memberRole = await this.rolesRepository.findOne({
        where: { name: 'member' },
      });
      if (!memberRole) {
        throw new NotFoundException('Vai trò thành viên mặc định không tìm thấy');
      }
      roles = [memberRole];
    }

    const user = this.usersRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
      name: finalName,
      phone: createUserDto.phone || createUserDto.mobile,
      avatarUrl: createUserDto.avatar,
      roles: roles,
    });

    const savedUser = await this.usersRepository.save(user);

    // Auto-create 1:1 chats with all existing users
    await this.chatService.ensureDirectChatsForUser(savedUser.id);

    // Send welcome email with credentials
    try {
      await this.emailService.sendAccountCreatedEmail(
        savedUser.email,
        savedUser.name,
        plainPassword,
      );
    } catch (error) {
      console.error('Failed to send account created email:', error);
      // Don't fail user creation if email fails
    }

    return savedUser;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check email conflict if email is being changed
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email đã được sử dụng');
      }
    }

    // Handle roleIds if provided
    if (updateUserDto.roleIds && updateUserDto.roleIds.length > 0) {
      const roles = await this.rolesRepository.find({
        where: { id: In(updateUserDto.roleIds) },
      });
      if (roles.length !== updateUserDto.roleIds.length) {
        throw new BadRequestException('Một số vai trò không tìm thấy');
      }
      user.roles = roles;
      delete updateUserDto.roleIds; // Don't assign this directly
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);

    // Clear roles relationship first
    user.roles = [];
    await this.usersRepository.save(user);

    // Then delete the user
    await this.usersRepository.delete(id);
  }

  async assignRoles(userId: string, roleIds: string[]): Promise<User> {
    const user = await this.findOne(userId);

    const roles = await this.rolesRepository.find({
      where: { id: In(roleIds) },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException('Một số ID vai trò không hợp lệ');
    }

    user.roles = roles;
    return this.usersRepository.save(user);
  }

  async removeRole(userId: string, roleId: string): Promise<User> {
    const user = await this.findOne(userId);

    user.roles = user.roles.filter((role) => role.id !== roleId);

    if (user.roles.length === 0) {
      throw new BadRequestException('Người dùng phải có ít nhất một vai trò');
    }

    return this.usersRepository.save(user);
  }

  async updateStatus(userId: string, status: string): Promise<User> {
    const user = await this.findOne(userId);
    user.status = status as any;
    return this.usersRepository.save(user);
  }

  async toggleActive(userId: string): Promise<User> {
    const user = await this.findOne(userId);
    user.isActive = !user.isActive;
    return this.usersRepository.save(user);
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    online: number;
    byDepartment: Record<string, number>;
  }> {
    const total = await this.usersRepository.count();
    const active = await this.usersRepository.count({
      where: { isActive: true },
    });
    const inactive = total - active;
    const online = await this.usersRepository.count({
      where: { status: 'online' as any },
    });

    // Count by department
    const departments = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.department', 'department')
      .addSelect('COUNT(*)', 'count')
      .where('user.department IS NOT NULL')
      .groupBy('user.department')
      .getRawMany();

    const byDepartment: Record<string, number> = {};
    departments.forEach((dept) => {
      byDepartment[dept.department] = parseInt(dept.count);
    });

    return {
      total,
      active,
      inactive,
      online,
      byDepartment,
    };
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    const user = await this.findOne(userId);
    user.avatarUrl = avatarUrl;
    return this.usersRepository.save(user);
  }

  async getUserSettings(userId: string): Promise<UserSettings> {
    let settings = await this.userSettingsRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'theme'],
    });

    if (!settings) {
      // Create default settings if not exists
      const user = await this.findOne(userId);
      settings = this.userSettingsRepository.create({
        user,
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        emailNotifications: true,
        pushNotifications: true,
        soundEnabled: true,
      });
      await this.userSettingsRepository.save(settings);
    }

    return settings;
  }

  async updateUserSettings(
    userId: string,
    settingsData: Partial<UserSettings>,
  ): Promise<UserSettings> {
    const settings = await this.getUserSettings(userId);
    Object.assign(settings, settingsData);
    return this.userSettingsRepository.save(settings);
  }

  async updateProfile(
    userId: string,
    updateData: {
      name?: string;
      phone?: string;
      bio?: string;
      department?: string;
      jobRole?: string;
    },
  ): Promise<User> {
    const user = await this.findOne(userId);
    Object.assign(user, updateData);
    return this.usersRepository.save(user);
  }
}
