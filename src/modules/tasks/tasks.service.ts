import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThanOrEqual, Between } from 'typeorm';
import { Task, TaskStatus } from '../../entities/task.entity';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { Tag } from '../../entities/tag.entity';
import { TaskReminder } from '../../entities/task-reminder.entity';
import { ChecklistItem } from '../../entities/checklist-item.entity';
import { Attachment } from '../../entities/attachment.entity';
import { Comment } from '../../entities/comment.entity';
import { CommentReaction } from '../../entities/comment-reaction.entity';
import { ActivityLog, ActivityAction, ActivityEntityType } from '../../entities/activity-log.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { CreateChecklistItemDto, UpdateChecklistItemDto } from './dto/checklist-item.dto';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    @InjectRepository(TaskReminder)
    private remindersRepository: Repository<TaskReminder>,
    @InjectRepository(ChecklistItem)
    private checklistItemsRepository: Repository<ChecklistItem>,
    @InjectRepository(Attachment)
    private attachmentsRepository: Repository<Attachment>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(CommentReaction)
    private reactionsRepository: Repository<CommentReaction>,
    @InjectRepository(ActivityLog)
    private activityLogsRepository: Repository<ActivityLog>,
  ) {}

  async findAll(query: QueryTaskDto): Promise<{
    data: Task[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { search, status, priority, projectId, assigneeId, createdById, tagId, dueDateFrom, dueDateTo, overdue, sortBy, sortOrder } = query;
    const page = query.page || 1;
    const limit = query.limit || 10;

    const queryBuilder = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.assignedBy', 'assignedBy')
      .leftJoinAndSelect('task.assignees', 'assignee')
      .leftJoinAndSelect('task.tags', 'tag')
      .leftJoinAndSelect('task.checklistItems', 'checklist')
      .leftJoinAndSelect('task.attachments', 'attachment');

    // Search
    if (search) {
      queryBuilder.where('(task.title LIKE :search OR task.description LIKE :search)', { search: `%${search}%` });
    }

    // Filters
    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority });
    }

    if (projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', { projectId });
    }

    if (assigneeId) {
      queryBuilder.andWhere('assignee.id = :assigneeId', { assigneeId });
    }

    if (createdById) {
      queryBuilder.andWhere('task.createdById = :createdById', { createdById });
    }

    if (tagId) {
      queryBuilder.andWhere('tag.id = :tagId', { tagId });
    }

    if (dueDateFrom && dueDateTo) {
      queryBuilder.andWhere('task.dueDate BETWEEN :dueDateFrom AND :dueDateTo', { dueDateFrom, dueDateTo });
    } else if (dueDateFrom) {
      queryBuilder.andWhere('task.dueDate >= :dueDateFrom', { dueDateFrom });
    } else if (dueDateTo) {
      queryBuilder.andWhere('task.dueDate <= :dueDateTo', { dueDateTo });
    }

    if (overdue === 'true') {
      const now = new Date().toISOString();
      queryBuilder.andWhere('task.dueDate < :now', { now });
      queryBuilder.andWhere('task.status != :doneStatus', { doneStatus: TaskStatus.DONE });
    }

    // Sorting
    const orderDirection = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortField = sortBy || 'createdAt';
    queryBuilder.orderBy(`task.${sortField}`, orderDirection);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: [
        'project',
        'createdBy',
        'assignedBy',
        'assignees',
        'tags',
        'checklistItems',
        'attachments',
        'reminders',
        'comments',
        'comments.author',
        'comments.reactions',
        'comments.reactions.user',
      ],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const project = await this.projectsRepository.findOne({
      where: { id: createTaskDto.projectId },
      relations: ['members'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user is project member
    const isMember = project.members.some(m => m.id === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    const task = this.tasksRepository.create({
      title: createTaskDto.title,
      description: createTaskDto.description,
      status: createTaskDto.status || TaskStatus.TODO,
      priority: createTaskDto.priority,
      dueDate: createTaskDto.dueDate,
      estimatedHours: createTaskDto.estimatedHours || 0,
    });
    task.project = project;
    task.createdBy = user;

    if (createTaskDto.assignedById) {
      const assignedBy = await this.usersRepository.findOne({ where: { id: createTaskDto.assignedById } });
      if (assignedBy) {
        task.assignedBy = assignedBy;
      }
    }

    const savedTask = await this.tasksRepository.save(task);

    await this.logActivity(userId, ActivityAction.CREATE, ActivityEntityType.TASK, savedTask.id, {
      taskTitle: savedTask.title,
      projectId: project.id,
    });

    return this.findOne(savedTask.id);
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string): Promise<Task> {
    const task = await this.findOne(id);

    // Check permissions
    await this.checkTaskPermission(task, userId);

    Object.assign(task, updateTaskDto);
    const savedTask = await this.tasksRepository.save(task);

    await this.logActivity(userId, ActivityAction.UPDATE, ActivityEntityType.TASK, savedTask.id, {
      taskTitle: savedTask.title,
      changes: updateTaskDto,
    });

    return this.findOne(savedTask.id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const task = await this.findOne(id);

    // Only creator or project owner can delete
    const isCreator = task.createdBy.id === userId;
    const isProjectOwner = task.project.createdBy?.id === userId;

    if (!isCreator && !isProjectOwner) {
      throw new ForbiddenException('Only task creator or project owner can delete this task');
    }

    await this.logActivity(userId, ActivityAction.DELETE, ActivityEntityType.TASK, task.id, {
      taskTitle: task.title,
    });

    await this.tasksRepository.remove(task);
  }

  async assignUsers(taskId: string, userIds: string[], userId: string): Promise<Task> {
    const task = await this.findOne(taskId);
    await this.checkTaskPermission(task, userId);

    const users = await this.usersRepository.find({ where: { id: In(userIds) } });
    if (users.length !== userIds.length) {
      throw new BadRequestException('Some users not found');
    }

    // Check if all users are project members
    const projectMembers = task.project.members || [];
    const memberIds = projectMembers.map(m => m.id);
    const invalidUsers = users.filter(u => !memberIds.includes(u.id));

    if (invalidUsers.length > 0) {
      throw new BadRequestException('Some users are not members of the project');
    }

    task.assignees = users;
    await this.tasksRepository.save(task);

    await this.logActivity(userId, ActivityAction.ASSIGN, ActivityEntityType.TASK, taskId, {
      taskTitle: task.title,
      assignedUsers: users.map(u => ({ id: u.id, name: u.name })),
    });

    return this.findOne(taskId);
  }

  async removeAssignee(taskId: string, assigneeId: string, userId: string): Promise<Task> {
    const task = await this.findOne(taskId);
    await this.checkTaskPermission(task, userId);

    task.assignees = task.assignees.filter(a => a.id !== assigneeId);
    await this.tasksRepository.save(task);

    await this.logActivity(userId, ActivityAction.UPDATE, ActivityEntityType.TASK, taskId, {
      taskTitle: task.title,
      action: 'removed_assignee',
      removedAssigneeId: assigneeId,
    });

    return this.findOne(taskId);
  }

  async addTags(taskId: string, tagIds: string[], userId: string): Promise<Task> {
    const task = await this.findOne(taskId);
    await this.checkTaskPermission(task, userId);

    const tags = await this.tagsRepository.find({ where: { id: In(tagIds) } });
    if (tags.length !== tagIds.length) {
      throw new BadRequestException('Some tags not found');
    }

    const existingTagIds = task.tags.map(t => t.id);
    const newTags = tags.filter(t => !existingTagIds.includes(t.id));

    task.tags = [...task.tags, ...newTags];
    await this.tasksRepository.save(task);

    return this.findOne(taskId);
  }

  async removeTag(taskId: string, tagId: string, userId: string): Promise<Task> {
    const task = await this.findOne(taskId);
    await this.checkTaskPermission(task, userId);

    task.tags = task.tags.filter(t => t.id !== tagId);
    await this.tasksRepository.save(task);

    return this.findOne(taskId);
  }

  // Checklist Items
  async addChecklistItem(taskId: string, dto: CreateChecklistItemDto, userId: string): Promise<ChecklistItem> {
    const task = await this.findOne(taskId);
    await this.checkTaskPermission(task, userId);

    const item = this.checklistItemsRepository.create({
      ...dto,
      task,
    });

    return this.checklistItemsRepository.save(item);
  }

  async updateChecklistItem(taskId: string, itemId: string, dto: UpdateChecklistItemDto, userId: string): Promise<ChecklistItem> {
    const task = await this.findOne(taskId);
    await this.checkTaskPermission(task, userId);

    const item = await this.checklistItemsRepository.findOne({ where: { id: itemId, task: { id: taskId } } });
    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    Object.assign(item, dto);
    return this.checklistItemsRepository.save(item);
  }

  async removeChecklistItem(taskId: string, itemId: string, userId: string): Promise<void> {
    const task = await this.findOne(taskId);
    await this.checkTaskPermission(task, userId);

    const item = await this.checklistItemsRepository.findOne({ where: { id: itemId, task: { id: taskId } } });
    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    await this.checklistItemsRepository.remove(item);
  }

  // Reminders
  async addReminder(taskId: string, dto: CreateReminderDto, userId: string): Promise<TaskReminder> {
    const task = await this.findOne(taskId);
    await this.checkTaskPermission(task, userId);

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const reminder = this.remindersRepository.create({
      reminderDate: dto.reminderDate,
      message: dto.message,
    });
    reminder.task = task;
    reminder.createdBy = user;

    return this.remindersRepository.save(reminder);
  }

  async removeReminder(taskId: string, reminderId: string, userId: string): Promise<void> {
    const task = await this.findOne(taskId);
    await this.checkTaskPermission(task, userId);

    const reminder = await this.remindersRepository.findOne({ where: { id: reminderId, task: { id: taskId } } });
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    await this.remindersRepository.remove(reminder);
  }

  // Comments
  async addComment(taskId: string, dto: CreateCommentDto, userId: string): Promise<Comment> {
    const task = await this.findOne(taskId);
    await this.checkTaskPermission(task, userId);

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const comment = this.commentsRepository.create({
      content: dto.content,
    });
    comment.task = task;
    comment.author = user;

    const savedComment = await this.commentsRepository.save(comment);

    // Update comments count
    task.commentsCount = (task.commentsCount || 0) + 1;
    await this.tasksRepository.save(task);

    await this.logActivity(userId, ActivityAction.COMMENT, ActivityEntityType.TASK, taskId, {
      taskTitle: task.title,
      comment: dto.content.substring(0, 100),
    });

    const result = await this.commentsRepository.findOne({
      where: { id: savedComment.id },
      relations: ['author', 'reactions', 'reactions.user'],
    });

    if (!result) {
      throw new NotFoundException('Comment not found after creation');
    }

    return result;
  }

  async updateComment(taskId: string, commentId: string, dto: UpdateCommentDto, userId: string): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, task: { id: taskId } },
      relations: ['author', 'task'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.author.id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = dto.content;
    return this.commentsRepository.save(comment);
  }

  async removeComment(taskId: string, commentId: string, userId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, task: { id: taskId } },
      relations: ['author', 'task'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.author.id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentsRepository.remove(comment);

    // Update comments count
    const task = await this.tasksRepository.findOne({ where: { id: taskId } });
    if (task) {
      task.commentsCount = Math.max(0, (task.commentsCount || 0) - 1);
      await this.tasksRepository.save(task);
    }
  }

  // Reactions
  async addReaction(commentId: string, emoji: string, userId: string): Promise<CommentReaction> {
    const comment = await this.commentsRepository.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already reacted with this emoji
    const existing = await this.reactionsRepository.findOne({
      where: { comment: { id: commentId }, user: { id: userId }, emoji },
    });

    if (existing) {
      return existing;
    }

    const reaction = this.reactionsRepository.create({ emoji });
    reaction.comment = comment;
    reaction.user = user;

    return this.reactionsRepository.save(reaction);
  }

  async removeReaction(commentId: string, reactionId: string, userId: string): Promise<void> {
    const reaction = await this.reactionsRepository.findOne({
      where: { id: reactionId, comment: { id: commentId } },
      relations: ['user'],
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    if (reaction.user.id !== userId) {
      throw new ForbiddenException('You can only remove your own reactions');
    }

    await this.reactionsRepository.remove(reaction);
  }

  // Statistics
  async getStatistics(projectId?: string): Promise<any> {
    const queryBuilder = this.tasksRepository.createQueryBuilder('task');

    if (projectId) {
      queryBuilder.where('task.projectId = :projectId', { projectId });
    }

    const total = await queryBuilder.getCount();
    const todo = await queryBuilder.clone().andWhere('task.status = :status', { status: TaskStatus.TODO }).getCount();
    const inProgress = await queryBuilder.clone().andWhere('task.status = :status', { status: TaskStatus.IN_PROGRESS }).getCount();
    const review = await queryBuilder.clone().andWhere('task.status = :status', { status: TaskStatus.REVIEW }).getCount();
    const done = await queryBuilder.clone().andWhere('task.status = :status', { status: TaskStatus.DONE }).getCount();

    const now = new Date();
    const overdue = await queryBuilder
      .clone()
      .andWhere('task.dueDate < :now', { now })
      .andWhere('task.status != :status', { status: TaskStatus.DONE })
      .getCount();

    return {
      total,
      byStatus: { todo, inProgress, review, done },
      overdue,
    };
  }

  private async checkTaskPermission(task: Task, userId: string): Promise<void> {
    const project = await this.projectsRepository.findOne({
      where: { id: task.project.id },
      relations: ['members', 'createdBy'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isMember = project.members.some(m => m.id === userId);
    const isOwner = project.createdBy?.id === userId;

    if (!isMember && !isOwner) {
      throw new ForbiddenException('You do not have permission to modify this task');
    }
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
