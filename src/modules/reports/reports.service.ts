import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '../../entities/task.entity';
import { Project, ProjectStatus } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { ActivityLog } from '../../entities/activity-log.entity';
import {
  GenerateReportDto,
  ReportType,
  ExportFormat,
} from './dto/generate-report.dto';
import { GetChartDataDto, ChartType } from './dto/get-chart-data.dto';
import { Parser } from 'json2csv';
import { ExportService } from './export.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ActivityLog)
    private activityLogsRepository: Repository<ActivityLog>,
    private exportService: ExportService,
  ) {}

  async generateReport(dto: GenerateReportDto) {
    const { type, startDate, endDate, projectId, userId, format } = dto;

    let data: any[];
    let reportTitle: string;

    switch (type) {
      case ReportType.TASKS:
        data = await this.generateTasksReport(
          startDate,
          endDate,
          projectId,
          userId,
        );
        reportTitle = 'Tasks Report';
        break;
      case ReportType.PROJECTS:
        data = await this.generateProjectsReport(startDate, endDate, userId);
        reportTitle = 'Projects Report';
        break;
      case ReportType.USERS:
        data = await this.generateUsersReport();
        reportTitle = 'Users Report';
        break;
      case ReportType.ACTIVITY:
        data = await this.generateActivityReport(startDate, endDate, userId);
        reportTitle = 'Activity Report';
        break;
      case ReportType.PERFORMANCE:
        data = await this.generatePerformanceReport(startDate, endDate, userId);
        reportTitle = 'Performance Report';
        break;
      default:
        throw new Error('Invalid report type');
    }

    if (format === ExportFormat.CSV) {
      return this.exportToCsv(data, reportTitle);
    } else if (format === ExportFormat.PDF) {
      return this.exportToPdf(data, reportTitle);
    } else if (format === ExportFormat.EXCEL) {
      return this.exportToExcel(data, reportTitle);
    }

    return { data, reportTitle, generatedAt: new Date() };
  }

  private async generateTasksReport(
    startDate?: string,
    endDate?: string,
    projectId?: string,
    userId?: string,
  ) {
    const qb = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignees', 'assignees')
      .leftJoinAndSelect('task.createdBy', 'createdBy');

    if (startDate && endDate) {
      qb.andWhere('task.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (projectId) {
      qb.andWhere('task.projectId = :projectId', { projectId });
    }

    if (userId) {
      qb.andWhere('assignees.id = :userId', { userId });
    }

    const tasks = await qb.getMany();

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      project: task.project?.name || 'N/A',
      assignees: task.assignees?.map((a) => a.name).join(', ') || 'Unassigned',
      createdBy: task.createdBy?.name || 'N/A',
      dueDate: task.dueDate || 'No due date',
      createdAt: task.createdAt,
    }));
  }

  private async generateProjectsReport(
    startDate?: string,
    endDate?: string,
    userId?: string,
  ) {
    const qb = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.members', 'members');

    if (startDate && endDate) {
      qb.andWhere('project.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (userId) {
      qb.andWhere('members.userId = :userId', {
        userId,
      });
    }

    const projects = await qb.getMany();

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      membersCount: project.members?.length || 0,
      startDate: project.startDate || 'N/A',
      endDate: project.endDate || 'N/A',
      createdAt: project.createdAt,
    }));
  }

  private async generateUsersReport() {
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .getMany();

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles?.map((r) => r.name).join(', ') || 'No roles',
      status: user.status,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));
  }

  private async generateActivityReport(
    startDate?: string,
    endDate?: string,
    userId?: string,
  ) {
    const qb = this.activityLogsRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user');

    if (startDate && endDate) {
      qb.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (userId) {
      qb.andWhere('log.user.id = :userId', { userId });
    }

    qb.orderBy('log.createdAt', 'DESC');

    const logs = await qb.getMany();

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      user: log.user?.name || 'N/A',
      metadata: log.metadata || {},
      createdAt: log.createdAt,
    }));
  }

  private async generatePerformanceReport(
    startDate?: string,
    endDate?: string,
    userId?: string,
  ) {
    const qb = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignees', 'assignees')
      .leftJoinAndSelect('task.project', 'project');

    if (startDate && endDate) {
      qb.andWhere('task.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (userId) {
      qb.andWhere('assignees.id = :userId', { userId });
    }

    const tasks = await qb.getMany();

    // Calculate performance metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status === TaskStatus.DONE,
    ).length;
    const overdueTasks = tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        t.status !== TaskStatus.DONE,
    ).length;

    const performanceByUser = tasks.reduce((acc, task) => {
      task.assignees?.forEach((assignee) => {
        if (!acc[assignee.id]) {
          acc[assignee.id] = {
            userId: assignee.id,
            userName: assignee.name,
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            overdueTasks: 0,
          };
        }
        acc[assignee.id].totalTasks++;
        if (task.status === TaskStatus.DONE) {
          acc[assignee.id].completedTasks++;
        } else if (task.status === TaskStatus.IN_PROGRESS) {
          acc[assignee.id].inProgressTasks++;
        }
        if (
          task.dueDate &&
          new Date(task.dueDate) < new Date() &&
          task.status !== TaskStatus.DONE
        ) {
          acc[assignee.id].overdueTasks++;
        }
      });
      return acc;
    }, {});

    return Object.values(performanceByUser);
  }

  private exportToCsv(data: any[], title: string) {
    try {
      // Format data for better CSV output
      const formattedData = data.map((item) => {
        const formatted: any = {};
        Object.keys(item).forEach((key) => {
          // Convert camelCase to readable text
          const readableKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();

          let value = item[key];

          // Format dates
          if (value instanceof Date) {
            value = value.toLocaleString('vi-VN');
          }
          // Format numbers
          else if (typeof value === 'number') {
            value = value.toFixed(2);
          }
          // Format objects
          else if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }

          formatted[readableKey] = value;
        });
        return formatted;
      });

      // Generate CSV with proper headers
      const fields = Object.keys(formattedData[0] || {});
      const parser = new Parser({ fields });
      const csv = parser.parse(formattedData);

      // Add UTF-8 BOM for Excel compatibility
      const bom = '\uFEFF';
      const header = `${title}\n`;
      const timestamp = `Generated: ${new Date().toLocaleString('vi-VN')}\n\n`;

      const content = bom + header + timestamp + csv;

      return {
        format: 'csv',
        title,
        content,
        filename: `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
      };
    } catch (error) {
      throw new Error(`Failed to generate CSV report: ${error.message}`);
    }
  }

  private exportToPdf(data: any[], title: string) {
    try {
      // Generate HTML table that can be printed to PDF
      const htmlContent = this.exportService.generateHtmlTable({
        title,
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        data,
        fileName: title,
      });

      return {
        format: 'html',
        title,
        content: htmlContent,
        mimeType: 'text/html',
        filename: `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`,
      };
    } catch (error) {
      return {
        format: 'pdf',
        title,
        message: 'PDF export available - use print to PDF feature',
        data,
        filename: `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      };
    }
  }

  private exportToExcel(data: any[], title: string) {
    try {
      // For now, return CSV which can be opened in Excel
      return this.exportToCsv(data, title);
    } catch (error) {
      return {
        format: 'excel',
        title,
        message: 'Excel generation available - CSV can be opened in Excel',
        data,
        filename: `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`,
      };
    }
  }

  async getChartData(dto: GetChartDataDto) {
    const { type, startDate, endDate } = dto;

    switch (type) {
      case ChartType.TASK_STATUS:
        return this.getTaskStatusChart();
      case ChartType.TASK_PRIORITY:
        return this.getTaskPriorityChart();
      case ChartType.PROJECT_STATUS:
        return this.getProjectStatusChart();
      case ChartType.USER_ACTIVITY:
        return this.getUserActivityChart(startDate, endDate);
      case ChartType.TASK_COMPLETION_TREND:
        return this.getTaskCompletionTrendChart(startDate, endDate);
      default:
        throw new Error('Invalid chart type');
    }
  }

  private async getTaskStatusChart() {
    const statusCounts = await this.tasksRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany();

    return {
      type: 'task_status',
      data: statusCounts.map((item) => ({
        label: item.status,
        value: parseInt(item.count),
      })),
    };
  }

  private async getTaskPriorityChart() {
    const priorityCounts = await this.tasksRepository
      .createQueryBuilder('task')
      .select('task.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.priority')
      .getRawMany();

    return {
      type: 'task_priority',
      data: priorityCounts.map((item) => ({
        label: item.priority,
        value: parseInt(item.count),
      })),
    };
  }

  private async getProjectStatusChart() {
    const statusCounts = await this.projectsRepository
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.status')
      .getRawMany();

    return {
      type: 'project_status',
      data: statusCounts.map((item) => ({
        label: item.status,
        value: parseInt(item.count),
      })),
    };
  }

  private async getUserActivityChart(startDate?: string, endDate?: string) {
    const qb = this.activityLogsRepository
      .createQueryBuilder('log')
      .select('DATE(log.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count');

    if (startDate && endDate) {
      qb.where('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      qb.where('log.createdAt >= :startDate', { startDate: thirtyDaysAgo });
    }

    const activityData = await qb
      .groupBy('DATE(log.createdAt)')
      .orderBy('DATE(log.createdAt)', 'ASC')
      .getRawMany();

    return {
      type: 'user_activity',
      data: activityData.map((item) => ({
        date: item.date,
        value: parseInt(item.count),
      })),
    };
  }

  private async getTaskCompletionTrendChart(
    startDate?: string,
    endDate?: string,
  ) {
    const qb = this.tasksRepository
      .createQueryBuilder('task')
      .select('DATE(task.updatedAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('task.status = :status', { status: TaskStatus.DONE });

    if (startDate && endDate) {
      qb.andWhere('task.updatedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      qb.andWhere('task.updatedAt >= :startDate', { startDate: thirtyDaysAgo });
    }

    const completionData = await qb
      .groupBy('DATE(task.updatedAt)')
      .orderBy('DATE(task.updatedAt)', 'ASC')
      .getRawMany();

    return {
      type: 'task_completion_trend',
      data: completionData.map((item) => ({
        date: item.date,
        value: parseInt(item.count),
      })),
    };
  }

  async getTeamPerformance(startDate?: string, endDate?: string) {
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .getMany();

    const teamData = await Promise.all(
      users.map(async (user) => {
        // Count all assigned tasks using query builder
        let assignedQuery = this.tasksRepository
          .createQueryBuilder('task')
          .leftJoinAndSelect('task.assignees', 'assignee')
          .where('assignee.id = :userId', { userId: user.id });

        if (startDate && endDate) {
          assignedQuery = assignedQuery.andWhere(
            'task.createdAt BETWEEN :startDate AND :endDate',
            {
              startDate,
              endDate,
            },
          );
        }

        const assignedTasks = await assignedQuery.getCount();

        // Count completed tasks
        let completedQuery = this.tasksRepository
          .createQueryBuilder('task')
          .leftJoinAndSelect('task.assignees', 'assignee')
          .where('assignee.id = :userId', { userId: user.id })
          .andWhere('task.status = :status', { status: TaskStatus.DONE });

        if (startDate && endDate) {
          completedQuery = completedQuery.andWhere(
            'task.createdAt BETWEEN :startDate AND :endDate',
            {
              startDate,
              endDate,
            },
          );
        }

        const completedTasks = await completedQuery.getCount();

        const completionRate =
          assignedTasks > 0 ? (completedTasks / assignedTasks) * 100 : 0;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          assignedTasks,
          completedTasks,
          completionRate: parseFloat(completionRate.toFixed(2)),
          pendingTasks: assignedTasks - completedTasks,
        };
      }),
    );

    return teamData.sort((a, b) => b.completionRate - a.completionRate);
  }

  async getProjectsStatistics(startDate?: string, endDate?: string) {
    const projects = await this.projectsRepository.find();

    const projectStats = await Promise.all(
      projects.map(async (project) => {
        let totalQuery = this.tasksRepository
          .createQueryBuilder('task')
          .where('task.projectId = :projectId', { projectId: project.id });

        if (startDate && endDate) {
          totalQuery = totalQuery.andWhere(
            'task.createdAt BETWEEN :startDate AND :endDate',
            {
              startDate,
              endDate,
            },
          );
        }

        const totalTasks = await totalQuery.getCount();

        let completedQuery = this.tasksRepository
          .createQueryBuilder('task')
          .where('task.projectId = :projectId', { projectId: project.id })
          .andWhere('task.status = :status', { status: TaskStatus.DONE });

        if (startDate && endDate) {
          completedQuery = completedQuery.andWhere(
            'task.createdAt BETWEEN :startDate AND :endDate',
            {
              startDate,
              endDate,
            },
          );
        }

        const completedTasks = await completedQuery.getCount();

        let inProgressQuery = this.tasksRepository
          .createQueryBuilder('task')
          .where('task.projectId = :projectId', { projectId: project.id })
          .andWhere('task.status = :status', {
            status: TaskStatus.IN_PROGRESS,
          });

        if (startDate && endDate) {
          inProgressQuery = inProgressQuery.andWhere(
            'task.createdAt BETWEEN :startDate AND :endDate',
            {
              startDate,
              endDate,
            },
          );
        }

        const inProgressTasks = await inProgressQuery.getCount();

        const completionRate =
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          totalTasks,
          completedTasks,
          inProgressTasks,
          completionRate: parseFloat(completionRate.toFixed(2)),
          progress: parseFloat(completionRate.toFixed(2)),
        };
      }),
    );

    return projectStats.sort((a, b) => b.completionRate - a.completionRate);
  }

  async getOverallStatistics() {
    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      totalProjects,
      activeProjects,
      totalUsers,
      activeUsers,
    ] = await Promise.all([
      this.tasksRepository.count(),
      this.tasksRepository.count({ where: { status: TaskStatus.DONE } }),
      this.tasksRepository.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      this.projectsRepository.count(),
      this.projectsRepository.count({
        where: { status: ProjectStatus.ACTIVE },
      }),
      this.usersRepository.count(),
      this.usersRepository.count({ where: { isActive: true } }),
    ]);

    const completionRate =
      totalTasks > 0
        ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(2))
        : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      completionRate,
      totalProjects,
      projectsInProgress: activeProjects,
      totalUsers,
      activeUsers,
      projectsCompleted: 0,
      activeTasks: inProgressTasks,
      tasksByStatus: {},
      tasksByPriority: {},
    };
  }
}
