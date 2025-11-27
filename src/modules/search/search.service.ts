import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { Project } from '../../entities/project.entity';
import { Note } from '../../entities/note.entity';
import { User } from '../../entities/user.entity';
import { Chat } from '../../entities/chat.entity';
import { GlobalSearchDto, SearchType } from './dto/global-search.dto';
import { SearchSuggestionsDto } from './dto/search-suggestions.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Chat)
    private chatsRepository: Repository<Chat>,
  ) {}

  async globalSearch(dto: GlobalSearchDto, userId: string) {
    const { query, type, limit = 20 } = dto;
    const searchPattern = `%${query}%`;

    const results: any = {
      query,
      type,
      results: {},
    };

    if (type === SearchType.ALL || type === SearchType.TASKS) {
      results.results.tasks = await this.searchTasks(searchPattern, limit, userId);
    }

    if (type === SearchType.ALL || type === SearchType.PROJECTS) {
      results.results.projects = await this.searchProjects(searchPattern, limit, userId);
    }

    if (type === SearchType.ALL || type === SearchType.NOTES) {
      results.results.notes = await this.searchNotes(searchPattern, limit, userId);
    }

    if (type === SearchType.ALL || type === SearchType.USERS) {
      results.results.users = await this.searchUsers(searchPattern, limit);
    }

    if (type === SearchType.ALL || type === SearchType.CHATS) {
      results.results.chats = await this.searchChats(searchPattern, limit, userId);
    }

    // Calculate total results
    results.totalResults = Object.values(results.results).reduce(
      (sum: number, items: any) => sum + (items?.length || 0),
      0,
    );

    return results;
  }

  private async searchTasks(pattern: string, limit: number, userId: string) {
    return this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignees', 'assignees')
      .leftJoin('task.assignees', 'userAssignee')
      .leftJoin('project.members', 'projectMember')
      .where(
        '(task.title ILIKE :pattern OR task.description ILIKE :pattern)',
        { pattern },
      )
      .andWhere(
        '(userAssignee.id = :userId OR projectMember.userId = :userId OR task.createdById = :userId)',
        { userId },
      )
      .select([
        'task.id',
        'task.title',
        'task.description',
        'task.status',
        'task.priority',
        'task.dueDate',
        'project.id',
        'project.name',
        'assignees.id',
        'assignees.name',
        'assignees.avatarUrl',
      ])
      .take(limit)
      .getMany();
  }

  private async searchProjects(pattern: string, limit: number, userId: string) {
    return this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoin('project.members', 'member')
      .where(
        '(project.name ILIKE :pattern OR project.description ILIKE :pattern)',
        { pattern },
      )
      .andWhere('(member.userId = :userId OR project.ownerId = :userId)', {
        userId,
      })
      .select([
        'project.id',
        'project.name',
        'project.description',
        'project.status',
        'project.color',
        'owner.id',
        'owner.name',
      ])
      .take(limit)
      .getMany();
  }

  private async searchNotes(pattern: string, limit: number, userId: string) {
    return this.notesRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.owner', 'owner')
      .leftJoin('note.sharedWith', 'shared')
      .where(
        '(note.title ILIKE :pattern OR note.content ILIKE :pattern)',
        { pattern },
      )
      .andWhere('(note.ownerId = :userId OR shared.id = :userId)', { userId })
      .select([
        'note.id',
        'note.title',
        'note.content',
        'note.isPinned',
        'note.createdAt',
        'owner.id',
        'owner.name',
      ])
      .take(limit)
      .getMany();
  }

  private async searchUsers(pattern: string, limit: number) {
    return this.usersRepository
      .createQueryBuilder('user')
      .where(
        '(user.name ILIKE :pattern OR user.email ILIKE :pattern)',
        { pattern },
      )
      .andWhere('user.isActive = :isActive', { isActive: true })
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.avatarUrl',
        'user.bio',
      ])
      .take(limit)
      .getMany();
  }

  private async searchChats(pattern: string, limit: number, userId: string) {
    return this.chatsRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.members', 'members')
      .where('chat.name ILIKE :pattern', { pattern })
      .andWhere('members.id = :userId', { userId })
      .select([
        'chat.id',
        'chat.name',
        'chat.type',
        'chat.createdAt',
        'members.id',
        'members.name',
        'members.avatarUrl',
      ])
      .take(limit)
      .getMany();
  }

  async getSearchSuggestions(dto: SearchSuggestionsDto, userId: string) {
    const { query, type, limit = 5 } = dto;
    const searchPattern = `%${query}%`;

    const suggestions: any = {
      query,
      suggestions: [],
    };

    if (type === SearchType.ALL || type === SearchType.TASKS) {
      const tasks = await this.tasksRepository
        .createQueryBuilder('task')
        .leftJoin('task.assignees', 'assignee')
        .leftJoin('task.project', 'project')
        .leftJoin('project.members', 'member')
        .where('task.title ILIKE :pattern', { pattern: searchPattern })
        .andWhere(
          '(assignee.id = :userId OR member.userId = :userId OR task.createdById = :userId)',
          { userId },
        )
        .select(['task.id', 'task.title'])
        .take(limit)
        .getMany();

      suggestions.suggestions.push(
        ...tasks.map((t) => ({
          type: 'task',
          id: t.id,
          text: t.title,
        })),
      );
    }

    if (type === SearchType.ALL || type === SearchType.PROJECTS) {
      const projects = await this.projectsRepository
        .createQueryBuilder('project')
        .leftJoin('project.members', 'member')
        .where('project.name ILIKE :pattern', { pattern: searchPattern })
        .andWhere('(member.userId = :userId OR project.ownerId = :userId)', {
          userId,
        })
        .select(['project.id', 'project.name'])
        .take(limit)
        .getMany();

      suggestions.suggestions.push(
        ...projects.map((p) => ({
          type: 'project',
          id: p.id,
          text: p.name,
        })),
      );
    }

    if (type === SearchType.ALL || type === SearchType.NOTES) {
      const notes = await this.notesRepository
        .createQueryBuilder('note')
        .leftJoin('note.sharedWith', 'shared')
        .where('note.title ILIKE :pattern', { pattern: searchPattern })
        .andWhere('(note.ownerId = :userId OR shared.id = :userId)', {
          userId,
        })
        .select(['note.id', 'note.title'])
        .take(limit)
        .getMany();

      suggestions.suggestions.push(
        ...notes.map((n) => ({
          type: 'note',
          id: n.id,
          text: n.title,
        })),
      );
    }

    if (type === SearchType.ALL || type === SearchType.USERS) {
      const users = await this.usersRepository
        .createQueryBuilder('user')
        .where(
          '(user.name ILIKE :pattern OR user.email ILIKE :pattern)',
          { pattern: searchPattern },
        )
        .andWhere('user.isActive = :isActive', { isActive: true })
        .select(['user.id', 'user.name'])
        .take(limit)
        .getMany();

      suggestions.suggestions.push(
        ...users.map((u) => ({
          type: 'user',
          id: u.id,
          text: u.name,
        })),
      );
    }

    return suggestions;
  }

  async getRecentSearches(userId: string, limit: number = 10) {
    // This would typically be stored in a separate search_history table
    // For now, returning empty array as placeholder
    return {
      userId,
      searches: [],
    };
  }

  async saveSearchHistory(userId: string, query: string, type: string) {
    // Placeholder for saving search history
    // Would typically insert into search_history table
    return {
      saved: true,
      userId,
      query,
      type,
      timestamp: new Date(),
    };
  }

  async clearSearchHistory(userId: string) {
    // Placeholder for clearing search history
    return {
      cleared: true,
      userId,
    };
  }
}
