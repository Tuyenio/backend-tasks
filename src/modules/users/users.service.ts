import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async findAll(query: QueryUserDto): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const { search, status, isActive, department, roleId, sortBy, sortOrder } = query;
    const page = query.page || 1;
    const limit = query.limit || 10;

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role');

    // Search by name or email
    if (search) {
      queryBuilder.where(
        '(user.name LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` }
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
      throw new NotFoundException(`User with ID ${id} not found`);
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
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Get default member role
    const memberRole = await this.rolesRepository.findOne({ 
      where: { name: 'member' } 
    });

    if (!memberRole) {
      throw new NotFoundException('Default member role not found');
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      roles: [memberRole],
    });

    return this.usersRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check email conflict if email is being changed
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async assignRoles(userId: string, roleIds: string[]): Promise<User> {
    const user = await this.findOne(userId);

    const roles = await this.rolesRepository.find({
      where: { id: In(roleIds) },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException('Some role IDs are invalid');
    }

    user.roles = roles;
    return this.usersRepository.save(user);
  }

  async removeRole(userId: string, roleId: string): Promise<User> {
    const user = await this.findOne(userId);

    user.roles = user.roles.filter(role => role.id !== roleId);
    
    if (user.roles.length === 0) {
      throw new BadRequestException('User must have at least one role');
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
    const active = await this.usersRepository.count({ where: { isActive: true } });
    const inactive = total - active;
    const online = await this.usersRepository.count({ where: { status: 'online' as any } });

    // Count by department
    const departments = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.department', 'department')
      .addSelect('COUNT(*)', 'count')
      .where('user.department IS NOT NULL')
      .groupBy('user.department')
      .getRawMany();

    const byDepartment: Record<string, number> = {};
    departments.forEach(dept => {
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
}
