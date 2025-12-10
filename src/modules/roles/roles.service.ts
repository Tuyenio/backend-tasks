import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  private readonly allPermissions = [
    'projects.create',
    'projects.update',
    'projects.delete',
    'projects.view',
    'tasks.create',
    'tasks.update',
    'tasks.delete',
    'tasks.view',
    'tasks.assign',
    'tasks.complete',
    'notes.create',
    'notes.update',
    'notes.delete',
    'notes.view',
    'chat.create',
    'chat.send',
    'chat.delete',
    'reports.view',
    'reports.export',
    'reports.create',
    'users.view',
    'users.manage',
    'users.invite',
    'roles.view',
    'roles.manage',
    'roles.create',
    'roles.delete',
    'settings.view',
    'settings.manage',
    'team.view',
    'team.manage',
    'notifications.view',
    'notifications.manage',
    'search.use',
    'upload.create',
    'upload.view',
    'upload.delete',
  ];

  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  private expandPermissions(role: Role): Role {
    if (!role) return role;
    if (role.permissions?.includes('*')) {
      return { ...role, permissions: [...this.allPermissions] } as Role;
    }
    return role;
  }

  async findAll(): Promise<Role[]> {
    const roles = await this.rolesRepository.find({
      order: { createdAt: 'DESC' },
    });
    return roles.map((r) => this.expandPermissions(r));
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({ 
      where: { id },
      relations: ['users'],
    });
    
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    
    return this.expandPermissions(role);
  }

  async findByName(name: string): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { name } });
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    // Check if role name already exists
    const existingRole = await this.findByName(createRoleDto.name);
    if (existingRole) {
      throw new ConflictException(`Role with name ${createRoleDto.name} already exists`);
    }

    const role = this.rolesRepository.create({
      ...createRoleDto,
      isSystem: false, // Custom roles are never system roles
    });
    
    return this.rolesRepository.save(role);
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    // System roles can only have their permissions updated
    if (role.isSystem && (updateRoleDto.name || updateRoleDto.displayName)) {
      throw new BadRequestException('System roles cannot be renamed');
    }

    // Check name conflict if name is being changed
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.findByName(updateRoleDto.name);
      if (existingRole) {
        throw new ConflictException(`Role with name ${updateRoleDto.name} already exists`);
      }
    }

    Object.assign(role, updateRoleDto);
    return this.rolesRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    // Prevent deleting system roles
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    // Check if role has users
    if (role.users && role.users.length > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.displayName}' because it is assigned to ${role.users.length} user(s)`,
      );
    }

    await this.rolesRepository.remove(role);
  }

  async getPermissions(roleId: string): Promise<string[]> {
    const role = await this.findOne(roleId);
    return this.expandPermissions(role).permissions;
  }

  async hasPermission(roleId: string, permission: string): Promise<boolean> {
    const permissions = await this.getPermissions(roleId);
    return permissions.includes(permission);
  }

  async updatePermissions(id: string, permissions: string[]): Promise<Role> {
    const role = await this.findOne(id);
    role.permissions = permissions;
    return this.rolesRepository.save(role);
  }

  async getAvailablePermissions(): Promise<string[]> {
    return [...this.allPermissions];
  }
}
