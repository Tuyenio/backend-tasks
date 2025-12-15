import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Project, ProjectStatus } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { Tag } from '../../entities/tag.entity';
import {
  ActivityLog,
  ActivityAction,
  ActivityEntityType,
} from '../../entities/activity-log.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    @InjectRepository(ActivityLog)
    private activityLogsRepository: Repository<ActivityLog>,
  ) {}

  async findAll(query: QueryProjectDto): Promise<{
    data: Project[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { search, status, memberId, tagId, createdById, sortBy, sortOrder } =
      query;
    const page = query.page || 1;
    const limit = query.limit || 10;

    const queryBuilder = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.createdBy', 'createdBy')
      .leftJoinAndSelect('project.members', 'member')
      .leftJoinAndSelect('project.tags', 'tag')
      .leftJoinAndSelect('project.tasks', 'task');

    // Search by name or description
    if (search) {
      queryBuilder.where(
        '(project.name LIKE :search OR project.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('project.status = :status', { status });
    }

    // Filter by member
    if (memberId) {
      queryBuilder.andWhere('member.id = :memberId', { memberId });
    }

    // Filter by tag
    if (tagId) {
      queryBuilder.andWhere('tag.id = :tagId', { tagId });
    }

    // Filter by creator
    if (createdById) {
      queryBuilder.andWhere('project.createdById = :createdById', {
        createdById,
      });
    }

    // Sorting
    const validSortFields = [
      'name',
      'status',
      'progress',
      'createdAt',
      'startDate',
      'endDate',
      'deadline',
    ];
    const orderDirection = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortField =
      sortBy && validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`project.${sortField}`, orderDirection);

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

  async findOne(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'members', 'tags', 'tasks'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<Project> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const project = this.projectsRepository.create({
      name: createProjectDto.name,
      description: createProjectDto.description,
      color: createProjectDto.color,
      status: createProjectDto.status || ProjectStatus.ACTIVE,
      startDate: createProjectDto.startDate,
      endDate: createProjectDto.endDate,
      deadline: createProjectDto.deadline,
      progress: createProjectDto.progress || 0,
    });
    project.createdBy = user;
    project.members = [user]; // Creator is automatically a member

    const savedProject = await this.projectsRepository.save(project);

    // Log activity
    await this.logActivity(
      userId,
      ActivityAction.CREATE,
      ActivityEntityType.PROJECT,
      savedProject.id,
      {
        projectName: savedProject.name,
      },
    );

    return savedProject;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(id);

    // Get user with roles
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has permission (super_admin, admin, or is member/creator)
    const hasAdminRole = user.roles.some(
      (role) => role.name === 'super_admin' || role.name === 'admin',
    );
    const isMember = project.members.some((member) => member.id === userId);
    const isCreator = project.createdBy.id === userId;

    if (!hasAdminRole && !isMember && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to update this project',
      );
    }

    Object.assign(project, updateProjectDto);
    const savedProject = await this.projectsRepository.save(project);

    // Log activity
    await this.logActivity(
      userId,
      ActivityAction.UPDATE,
      ActivityEntityType.PROJECT,
      savedProject.id,
      {
        projectName: savedProject.name,
        changes: updateProjectDto,
      },
    );

    return savedProject;
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id);

    // Only creator can delete project
    if (project.createdBy.id !== userId) {
      throw new ForbiddenException(
        'Only the project creator can delete this project',
      );
    }

    // Log activity before deletion
    await this.logActivity(
      userId,
      ActivityAction.DELETE,
      ActivityEntityType.PROJECT,
      project.id,
      {
        projectName: project.name,
      },
    );

    await this.projectsRepository.remove(project);
  }

  async addMembers(
    projectId: string,
    userIds: string[],
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId);

    // Get user with roles
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has permission (super_admin, admin, or is member/creator)
    const hasAdminRole = user.roles.some(
      (role) => role.name === 'super_admin' || role.name === 'admin',
    );
    const isMember = project.members.some((member) => member.id === userId);
    const isCreator = project.createdBy.id === userId;

    if (!hasAdminRole && !isMember && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to add members to this project',
      );
    }

    const users = await this.usersRepository.find({
      where: { id: In(userIds) },
    });

    if (users.length !== userIds.length) {
      throw new NotFoundException('Some users were not found');
    }

    // Add only new members
    const existingMemberIds = project.members.map((m) => m.id);
    const newMembers = users.filter((u) => !existingMemberIds.includes(u.id));

    project.members = [...project.members, ...newMembers];
    const savedProject = await this.projectsRepository.save(project);

    // Log activity
    await this.logActivity(
      userId,
      ActivityAction.UPDATE,
      ActivityEntityType.PROJECT,
      projectId,
      {
        projectName: project.name,
        action: 'added_members',
        addedMembers: newMembers.map((u) => ({ id: u.id, name: u.name })),
      },
    );

    return savedProject;
  }

  async removeMember(
    projectId: string,
    memberId: string,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId);

    // Get user with roles
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has permission (super_admin, admin, or is creator)
    const hasAdminRole = user.roles.some(
      (role) => role.name === 'super_admin' || role.name === 'admin',
    );
    const isCreator = project.createdBy.id === userId;

    if (!hasAdminRole && !isCreator) {
      throw new ForbiddenException(
        'Only the project creator or admin can remove members',
      );
    }

    // Cannot remove creator
    if (memberId === project.createdBy.id) {
      throw new ForbiddenException(
        'Cannot remove the project creator from members',
      );
    }

    project.members = project.members.filter(
      (member) => member.id !== memberId,
    );
    const savedProject = await this.projectsRepository.save(project);

    // Log activity
    await this.logActivity(
      userId,
      ActivityAction.UPDATE,
      ActivityEntityType.PROJECT,
      projectId,
      {
        projectName: project.name,
        action: 'removed_member',
        removedMemberId: memberId,
      },
    );

    return savedProject;
  }

  async addTags(
    projectId: string,
    tagIds: string[],
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId);

    // Get user with roles
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has permission (super_admin, admin, or is member/creator)
    const hasAdminRole = user.roles.some(
      (role) => role.name === 'super_admin' || role.name === 'admin',
    );
    const isMember = project.members.some((member) => member.id === userId);
    const isCreator = project.createdBy.id === userId;

    if (!hasAdminRole && !isMember && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to add tags to this project',
      );
    }

    const tags = await this.tagsRepository.find({
      where: { id: In(tagIds) },
    });

    if (tags.length !== tagIds.length) {
      throw new NotFoundException('Some tags were not found');
    }

    // Add only new tags
    const existingTagIds = project.tags.map((t) => t.id);
    const newTags = tags.filter((t) => !existingTagIds.includes(t.id));

    project.tags = [...project.tags, ...newTags];
    const savedProject = await this.projectsRepository.save(project);

    // Log activity
    await this.logActivity(
      userId,
      ActivityAction.UPDATE,
      ActivityEntityType.PROJECT,
      projectId,
      {
        projectName: project.name,
        action: 'added_tags',
        addedTags: newTags.map((t) => ({ id: t.id, name: t.name })),
      },
    );

    return savedProject;
  }

  async removeTag(
    projectId: string,
    tagId: string,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(projectId);

    // Check if user is a member or creator
    const isMember = project.members.some((member) => member.id === userId);
    const isCreator = project.createdBy.id === userId;

    if (!isMember && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to remove tags from this project',
      );
    }

    project.tags = project.tags.filter((tag) => tag.id !== tagId);
    const savedProject = await this.projectsRepository.save(project);

    // Log activity
    await this.logActivity(
      userId,
      ActivityAction.UPDATE,
      ActivityEntityType.PROJECT,
      projectId,
      {
        projectName: project.name,
        action: 'removed_tag',
        removedTagId: tagId,
      },
    );

    return savedProject;
  }

  async getActivityLogs(
    projectId: string,
    limit: number = 50,
  ): Promise<ActivityLog[]> {
    await this.findOne(projectId); // Check if project exists

    return this.activityLogsRepository.find({
      where: { entityType: ActivityEntityType.PROJECT, entityId: projectId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getStatistics(projectId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    totalMembers: number;
    progress: number;
    overdueTasks: number;
  }> {
    const project = await this.findOne(projectId);

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(
      (t) => t.status === 'done',
    ).length;
    const inProgressTasks = project.tasks.filter(
      (t) => t.status === 'in_progress',
    ).length;
    const todoTasks = project.tasks.filter((t) => t.status === 'todo').length;
    const totalMembers = project.members.length;

    const now = new Date();
    const overdueTasks = project.tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done',
    ).length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      totalMembers,
      progress: project.progress,
      overdueTasks,
    };
  }

  async getAllStatistics(): Promise<{
    total: number;
    active: number;
    completed: number;
    onHold: number;
    cancelled: number;
  }> {
    const total = await this.projectsRepository.count();
    const active = await this.projectsRepository.count({
      where: { status: ProjectStatus.ACTIVE },
    });
    const completed = await this.projectsRepository.count({
      where: { status: ProjectStatus.COMPLETED },
    });
    const onHold = await this.projectsRepository.count({
      where: { status: ProjectStatus.ON_HOLD },
    });
    const cancelled = await this.projectsRepository.count({
      where: { status: 'cancelled' as any },
    });

    return {
      total,
      active,
      completed,
      onHold,
      cancelled,
    };
  }

  private async logActivity(
    userId: string,
    action: ActivityAction,
    entityType: ActivityEntityType,
    entityId: string,
    metadata: any,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const activityLog = this.activityLogsRepository.create({
      action,
      entityType,
      entityId,
      metadata,
    });
    activityLog.user = user;

    await this.activityLogsRepository.save(activityLog);
  }
}
